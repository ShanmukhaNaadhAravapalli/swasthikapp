"use client";

import React, { useState, useEffect } from "react";
import MoodStatsCard from "@/components/MoodStatsCard";

interface MoodTrackerProps {
  imageUrl: string | null | undefined;
  email?: string | null;
  userId: string; // Required to send to API
}

const MoodTracker: React.FC<MoodTrackerProps> = ({ imageUrl, email, userId }) => {
  const [profileImage, setProfileImage] = useState<string>("/placeholder.svg");
  const [moodText, setMoodText] = useState("");
  const [supportiveText, setSupportiveText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // used to force refresh of stats card after new mood posted
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  const getEmailAvatar = (email: string | null | undefined) => {
    if (!email || email.trim() === "") return "/placeholder.svg";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=333&color=fff&rounded=true`;
  };

  useEffect(() => {
    if (imageUrl && imageUrl.trim() !== "") {
      setProfileImage(imageUrl);
    } else {
      setProfileImage(getEmailAvatar(email));
    }
  }, [imageUrl, email]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const uploadedImageUrl = URL.createObjectURL(e.target.files[0]);
      setProfileImage(uploadedImageUrl);
      // TODO: Upload to backend if needed
    }
  };

  // Centralized submit logic
  const submitMood = async () => {
    if (!moodText.trim()) {
      setErrorMsg("Please enter how you're feeling.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        credentials: "include", // important for cookie-based auth
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ moodText, userId }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // no JSON body
      }

      if (res.ok && data) {
        // API may return supportiveText OR { quote, author } fields.
        if (typeof data.supportiveText === "string" && data.supportiveText.trim()) {
          setSupportiveText(data.supportiveText.trim());
        } else if (typeof data.quote === "string") {
          const q = data.quote.trim();
          const a = typeof data.author === "string" ? data.author.trim() : "";
          setSupportiveText(a ? `"${q}" — ${a}` : `"${q}"`);
        } else {
          // Fallback if API shape differs
          setSupportiveText(data?.message ?? "Thanks for sharing. Be kind to yourself.");
        }
        setSubmitted(true);
        setMoodText("");
        // trigger stats refresh so card updates after posting
        setStatsRefreshKey((k) => k + 1);
      } else {
        const msg = data?.error || data?.message || `Request failed (${res.status})`;
        setErrorMsg(msg);
        console.error("API error response:", res.status, data);
      }
    } catch (error) {
      console.error("Error submitting mood:", error);
      setErrorMsg("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // form submit handler
  const onSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    submitMood();
  };

  return (
    <div className="w-95 h-full bg-[#323232] rounded-xl p-4 flex flex-col items-center relative">
      {/* Profile avatar */}
      <div className="relative w-24 h-24 mt-4">
        <input
          type="file"
          accept="image/*"
          id="profile-upload"
          onChange={handleImageUpload}
          className="hidden"
        />
        <label
          htmlFor="profile-upload"
          className="cursor-pointer block w-full h-full rounded-full overflow-hidden border-4 border-gray-600 hover:border-blue-500 transition"
        >
          <img
            src={profileImage}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
          />
        </label>
      </div>

      {/* Input or AI Response (occupies same area, input vanishes on success) */}
      <div className="mt-6 w-full px-4">
        {!submitted ? (
          // Search-style translucent input under the profile (centered)
          <div className="w-full flex justify-center">
            <form onSubmit={onSubmit} className="w-full max-w-md">
              <div className="flex flex-col">
                <input
                  className="w-full px-6 py-3 placeholder-white/80 bg-black/40 backdrop-blur-sm text-white rounded-full outline-none
                             transition-all duration-300 focus:w-full shadow-md border border-white/10"
                  placeholder="How do you feel today?"
                  value={moodText}
                  onChange={(e) => setMoodText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSubmit();
                    }
                  }}
                  disabled={loading}
                  style={{
                    boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
                {errorMsg && <div className="mt-2 text-xs text-red-400">{errorMsg}</div>}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSubmit()}
                    className="text-sm px-3 py-1 rounded-full bg-white/90 text-black font-medium shadow"
                    disabled={loading}
                  >
                    {loading ? "Saving…" : "Share"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          // Display supportive text / quote (centered box) — occupies same max-w-md
          <div className="mx-auto max-w-md mt-2 p-4 bg-black/40 backdrop-blur-sm rounded-xl text-white border border-white/10 shadow transition-all">
            <p className="text-sm leading-relaxed text-center break-words">{supportiveText || "Stay strong! Tomorrow is a new day."}</p>
            <div className="mt-3 flex justify-center gap-3">
              
              
            </div>
          </div>
        )}
      </div>

      {/* Stats card below the input area */}
      <div className="mt-5 w-full px-4">
        {/* Pass userId + key so MoodStatsCard re-fetches on key change */}
        <div key={statsRefreshKey}>
          <MoodStatsCard userId={userId} />
        </div>
      </div>
    </div>
  );
};

export default MoodTracker;

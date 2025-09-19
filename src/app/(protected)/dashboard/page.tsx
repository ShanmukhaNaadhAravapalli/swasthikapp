// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import React from "react";
import MoodTracker from "@/components/ui/MoodTracker";
  import FintechCarouselDemo from "@/components/ui/Animation_feature";
import LearningProgressCards from "@/components/ui/main_features";

const DashboardPage = async () => {
  // Read Next.js headers (ReadonlyHeaders)
  const incoming = await headers();

  // Convert ReadonlyHeaders -> standard Headers instance (matches many auth libs' expected type)
  const headersForAuth = new Headers();
  for (const [k, v] of Array.from(incoming.entries())) {
    if (Array.isArray(v)) {
      for (const item of v) headersForAuth.append(k, String(item));
    } else if (v !== undefined) {
      headersForAuth.append(k, String(v));
    }
  }

  // Server-side debug (remove or reduce in production)
  console.log("DashboardPage headers keys:", Array.from(headersForAuth.keys()));
  console.log("DashboardPage cookie present:", Boolean(headersForAuth.get("cookie")));

  // Try to obtain session using the Headers instance
  let session: any = null;
  try {
    session = await auth.api.getSession({ headers: headersForAuth as unknown as Headers });
  } catch (err) {
    console.error("auth.api.getSession error:", err);
  }

  // If no valid session -> redirect to sign-in
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen bg-[#222222] p-6">
      <div className="flex-3 pr-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {session.user?.name || "User"}!
          </h1>

          {/* Search Bar */}
          <div className="mt-4 relative w-3/4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search activities, events..."
              className="w-full bg-[#2A2A2A] text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-2 border border-gray-300/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all rounded-xl"
            />
          </div>

        </div>
        <div>
            <FintechCarouselDemo />
          </div>

          <div>

      {/* Insert progress cards here */}
      <LearningProgressCards />

      {/* Other dashboard content can go here */}
    </div>

        {/* Other dashboard content can go here */}
      </div>

      <div className="flex-1">
        <MoodTracker
          userId={session.user?.id}
          imageUrl={session.user?.image ?? null}
          email={session.user?.email ?? null}
        />
      </div>
    </div>
  );
};

export default DashboardPage;

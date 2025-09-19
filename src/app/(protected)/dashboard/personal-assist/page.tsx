// app/dashboard/personal-assist/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import BottomActionBar from "@/components/assist/BottomActionBar";
import AssistChatInput from "@/components/assist/AssistChatInput";

/**
 * PersonalAssistPage — extended with:
 * - Shirt color monitor
 * - Object detection (coco-ssd)
 * - Automatic notification to D-ID agent when detections/colors change
 *
 * Install: npm i @tensorflow/tfjs @tensorflow-models/coco-ssd
 */

export default function PersonalAssistPage() {
  // ---------- UI & media state ----------
  const [videoOpen, setVideoOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; who: "user" | "assistant"; text: string }[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // DID embed controls
  const [conversationStarted, setConversationStarted] = useState(false);
  const dIdScriptRef = useRef<HTMLScriptElement | null>(null);
  const didContainerId = "did-agent-container";

  // shirt & detection
  const [shirtMonitorActive, setShirtMonitorActive] = useState(false);
  const [shirtColorHex, setShirtColorHex] = useState<string | null>(null);
  const [shirtBrightnessLabel, setShirtBrightnessLabel] = useState<string | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sampleIntervalRef = useRef<number | null>(null);

  const modelRef = useRef<any>(null);
  const [detecting, setDetecting] = useState(false);
  const [detections, setDetections] = useState<{ class: string; score: number; bbox: number[] }[]>([]);
  const detectionIntervalRef = useRef<number | null>(null);

  // prevent repeated / spammy announcements
  const lastSentRef = useRef<{ text?: string; ts?: number }>({ ts: 0 });

  // background/theme
  const [isDarkBackground, setIsDarkBackground] = useState(true);

  // ---------- helpers ----------
  function stopAndReleaseStream(stream: MediaStream | null) {
    try {
      if (!stream) return;
      stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
    } catch {}
  }

  function pushMessage(who: "user" | "assistant", text: string) {
    const id = `${who}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setMessages((m) => [...m, { id, who, text }]);
  }

  function clearChat() {
    setMessages([]);
  }

  // ---------- D-ID embed (same robust teardown approach) ----------
  const DID_SCRIPT_SRC = "https://agent.d-id.com/v2/index.js";
  const DID_SCRIPT_ID = "d-id-embed-sdk";
  const DID_CLIENT_KEY = "Z29vZ2xlLW9hdXRoMnwxMDA5MDMxMzYwNTY3MTE3NTMzODk6WjZmdWNZdmtkeFVtZjF5WmZHMDdW";
  const DID_AGENT_ID = "v2_agt_eeszrvtj";
  const DID_MODE = "full";

  function addDIDScript() {
    if (typeof window === "undefined") return;
    if (dIdScriptRef.current) return;

    const container = document.getElementById(didContainerId);
    if (container) {
      container.style.display = "block";
      container.style.opacity = "1";
      container.style.transform = "none";
    }

    const s = document.createElement("script");
    s.type = "module";
    s.id = DID_SCRIPT_ID;
    s.src = DID_SCRIPT_SRC;
    s.setAttribute("data-mode", DID_MODE);
    s.setAttribute("data-client-key", DID_CLIENT_KEY);
    s.setAttribute("data-agent-id", DID_AGENT_ID);
    s.setAttribute("data-name", "did-agent");
    s.setAttribute("data-monitor", "true");
    s.setAttribute("data-target-id", didContainerId);

    document.body.appendChild(s);
    dIdScriptRef.current = s;
  }

  function removeDIDScript() {
    try {
      // attempt teardown on common global candidates
      try {
        const names = ["DID", "did", "didAgent", "dID", "DID_AGENT", "didSession"];
        names.forEach((n) => {
          try {
            const g = (window as any)[n];
            if (!g) return;
            if (typeof g.destroy === "function") g.destroy();
            else if (typeof g.teardown === "function") g.teardown();
            else if (typeof g.stop === "function") g.stop();
            else if (typeof g.endSession === "function") g.endSession();
            else if (typeof g.close === "function") g.close();
            else if (typeof g.disconnect === "function") g.disconnect();
          } catch {}
        });
      } catch {}

      // remove injected scripts (best-effort)
      try {
        if (dIdScriptRef.current) {
          try {
            document.body.removeChild(dIdScriptRef.current);
          } catch {}
          dIdScriptRef.current = null;
        }
        const scripts = Array.from(document.getElementsByTagName("script"));
        scripts.forEach((sc) => {
          try {
            const src = sc.getAttribute("src") || "";
            if (src.includes("agent.d-id.com") || src.includes("d-id.com")) {
              sc.parentNode && sc.parentNode.removeChild(sc);
            }
          } catch {}
        });
      } catch {}

      // clear container but DO NOT remove the element node (React ownership)
      const container = document.getElementById(didContainerId);
      if (container) {
        try {
          const videos = Array.from(container.getElementsByTagName("video"));
          videos.forEach((v) => {
            try {
              v.pause();
              if ((v as any).srcObject && (v as any).srcObject.getTracks) {
                ((v as any).srcObject as MediaStream).getTracks().forEach((t) => {
                  try {
                    t.stop();
                  } catch {}
                });
              }
              v.removeAttribute("src");
              if ((v as any).srcObject) delete (v as any).srcObject;
              v.parentNode && v.parentNode.removeChild(v);
            } catch {}
          });

          const audios = Array.from(container.getElementsByTagName("audio"));
          audios.forEach((a) => {
            try {
              a.pause();
              if ((a as any).srcObject && (a as any).srcObject.getTracks) {
                ((a as any).srcObject as MediaStream).getTracks().forEach((t) => {
                  try {
                    t.stop();
                  } catch {}
                });
              }
              a.removeAttribute("src");
              if ((a as any).srcObject) delete (a as any).srcObject;
              a.parentNode && a.parentNode.removeChild(a);
            } catch {}
          });

          const iframes = Array.from(container.getElementsByTagName("iframe"));
          iframes.forEach((f) => {
            try {
              f.parentNode && f.parentNode.removeChild(f);
            } catch {}
          });

          container.innerHTML = "";
          container.style.transition = "none";
          container.style.transform = "none";
          container.style.opacity = "0";
          container.style.display = "none";
        } catch {}
      }

      // clear likely globals
      try {
        ["DID", "did", "didAgent", "dID", "DID_AGENT", "didSession"].forEach((n) => {
          try {
            if ((window as any)[n]) delete (window as any)[n];
          } catch {}
        });
      } catch {}
    } catch (e) {
      console.warn("removeDIDScript error:", e);
    }
  }

  // ---------- start/end conversation ----------
  function startConversation() {
    setMessages([]);
    setConversationStarted(true);
    setTimeout(() => {
      const container = document.getElementById(didContainerId);
      if (!container) {
        const parent = document.body;
        const el = document.createElement("div");
        el.id = didContainerId;
        el.className = "w-full h-full bg-black";
        el.setAttribute("style", "min-height:320px");
        parent.appendChild(el);
      } else {
        container.style.display = "block";
        container.style.opacity = "1";
        container.style.transform = "none";
      }
      addDIDScript();
    }, 80);
  }

  function endConversation() {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch {}
    stopAndReleaseStream(videoStream);
    setVideoStream(null);
    setVideoOpen(false);
    setVoiceListening(false);

    stopShirtMonitor();
    stopObjectDetection();

    removeDIDScript();

    setConversationStarted(false);
  }

  // ---------- background monitoring ----------
  useEffect(() => {
    function checkBackground() {
      const el = document.querySelector("body") as HTMLElement | null;
      if (!el) return;
      const style = getComputedStyle(el);
      const bg = style.backgroundColor || "rgb(0,0,0)";
      const rgb = bg.match(/\d+/g)?.map(Number) || [0, 0, 0];
      const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
      setIsDarkBackground(brightness < 128);
    }

    checkBackground();
    const observer = new MutationObserver(checkBackground);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
  }, []);

  // ---------- shirt sampling ----------
  const SAMPLE = {
    width: 120,
    height: 120,
    centerXRatio: 0.5,
    centerYRatio: 0.62,
    intervalMs: 300,
  };

  function ensureHiddenCanvas() {
    if (!hiddenCanvasRef.current) {
      const c = document.createElement("canvas");
      hiddenCanvasRef.current = c;
    }
    return hiddenCanvasRef.current!;
  }

  function rgbToHex(r: number, g: number, b: number) {
    const toHex = (v: number) => {
      const s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? "0" + s : s;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  function computeBrightnessLabel(r: number, g: number, b: number) {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    if (brightness < 40) return "very dark";
    if (brightness < 90) return "dark";
    if (brightness < 170) return "medium";
    if (brightness < 230) return "light";
    return "very light";
  }

  function sampleShirtColorOnce() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = ensureHiddenCanvas();
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    if (vw === 0 || vh === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = vw;
    canvas.height = vh;
    try {
      ctx.drawImage(video, 0, 0, vw, vh);
    } catch {
      return;
    }

    const sw = SAMPLE.width;
    const sh = SAMPLE.height;
    const cx = Math.floor(vw * SAMPLE.centerXRatio);
    const cy = Math.floor(vh * SAMPLE.centerYRatio);
    const sx = Math.max(0, cx - Math.floor(sw / 2));
    const sy = Math.max(0, cy - Math.floor(sh / 2));
    const w = Math.min(sw, vw - sx);
    const h = Math.min(sh, vh - sy);
    if (w <= 0 || h <= 0) return;
    const img = ctx.getImageData(sx, sy, w, h);
    const data = img.data;
    let rTotal = 0,
      gTotal = 0,
      bTotal = 0,
      count = 0;
    const step = 4 * 2;
    for (let i = 0; i < data.length; i += step) {
      rTotal += data[i];
      gTotal += data[i + 1];
      bTotal += data[i + 2];
      count++;
    }
    if (count === 0) return;
    const rAvg = Math.round(rTotal / count);
    const gAvg = Math.round(gTotal / count);
    const bAvg = Math.round(bTotal / count);
    const hex = rgbToHex(rAvg, gAvg, bAvg);
    const label = computeBrightnessLabel(rAvg, gAvg, bAvg);
    const changed = hex !== shirtColorHex;
    setShirtColorHex(hex);
    setShirtBrightnessLabel(label);
    if (changed) {
      maybeAnnounceDetections(hex, label, detections);
    }
  }

  function startShirtMonitor() {
    if (!videoOpen || !videoRef.current || !videoStream) {
      alert("Open the webcam first to start shirt monitoring.");
      return;
    }
    if (sampleIntervalRef.current) return;
    sampleShirtColorOnce();
    sampleIntervalRef.current = window.setInterval(sampleShirtColorOnce, SAMPLE.intervalMs);
    setShirtMonitorActive(true);
  }

  function stopShirtMonitor() {
    if (sampleIntervalRef.current) {
      window.clearInterval(sampleIntervalRef.current);
      sampleIntervalRef.current = null;
    }
    setShirtMonitorActive(false);
    setShirtColorHex(null);
    setShirtBrightnessLabel(null);
    if (hiddenCanvasRef.current) {
      hiddenCanvasRef.current.width = 1;
      hiddenCanvasRef.current.height = 1;
    }
    hiddenCanvasRef.current = null;
  }

  // ---------- object detection (coco-ssd) ----------
  const DETECTION_INTERVAL_MS = 800;

  async function loadModel() {
    if (modelRef.current) return modelRef.current;
    try {
      // dynamic import
      // @ts-ignore
      const coco = await import("@tensorflow-models/coco-ssd");
      // @ts-ignore
      const tf = await import("@tensorflow/tfjs");
      modelRef.current = await coco.load();
      return modelRef.current;
    } catch (e) {
      console.warn("Failed to load detection model:", e);
      return null;
    }
  }

  async function detectOnce() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !modelRef.current) return;
    try {
      // @ts-ignore
      const preds = await modelRef.current.detect(video);
      const filtered = preds
        .filter((p: any) => p.score && p.score > 0.4)
        .map((p: any) => ({ class: p.class, score: p.score, bbox: p.bbox }));
      // check if detection set changed significantly (simple check)
      const classesNow = filtered.map((f: any) => f.class).sort().join(",");
      const classesPrev = detections.map((d) => d.class).sort().join(",");
      setDetections(filtered);
      if (classesNow !== classesPrev) {
        maybeAnnounceDetections(shirtColorHex, shirtBrightnessLabel, filtered);
      }
    } catch (e) {
      // ignore occasional errors
    }
  }

  async function startObjectDetection() {
    if (!videoOpen) {
      alert("Open camera first to start detection.");
      return;
    }
    if (detecting) return;
    const model = await loadModel();
    if (!model) {
      alert("Could not load detection model.");
      return;
    }
    await detectOnce();
    detectionIntervalRef.current = window.setInterval(detectOnce, DETECTION_INTERVAL_MS);
    setDetecting(true);
  }

  function stopObjectDetection() {
    if (detectionIntervalRef.current) {
      window.clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setDetecting(false);
    setDetections([]);
    // keep model for faster restart; dispose if needed
  }

  // ---------- notify D-ID agent (attempts multiple methods) ----------
  /**
   * notifyAgent(text)
   * - tries likely SDK globals and methods
   * - tries posting message to iframe inside the did container
   * - falls back to local chat UI if no SDK method found
   */
  function notifyAgent(text: string) {
    if (!text) return;

    // 1) Try common global SDK objects
    try {
      const candidates = ["didAgent", "did", "DID", "dID", "DID_AGENT", "agent"];
      for (const name of candidates) {
        const g = (window as any)[name];
        if (!g) continue;
        // try common method names
        if (typeof g.send === "function") {
          try {
            g.send(text);
            return true;
          } catch {}
        }
        if (typeof g.sendMessage === "function") {
          try {
            g.sendMessage(text);
            return true;
          } catch {}
        }
        if (typeof g.speak === "function") {
          try {
            g.speak(text);
            return true;
          } catch {}
        }
        if (typeof g.postMessage === "function") {
          try {
            g.postMessage({ type: "message", text });
            return true;
          } catch {}
        }
      }
    } catch (e) {
      // ignore
    }

    // 2) Try postMessage to an iframe inside the container
    try {
      const container = document.getElementById(didContainerId);
      if (container) {
        const ifr = container.querySelector("iframe");
        if (ifr && (ifr as HTMLIFrameElement).contentWindow) {
          try {
            (ifr as HTMLIFrameElement).contentWindow!.postMessage({ type: "d-id:message", text }, "*");
            return true;
          } catch {}
        }
      }
    } catch (e) {
      // ignore
    }

    // 3) As a fallback, show in local chat and simulate an assistant reply
    try {
      pushMessage("user", text);
      setTimeout(() => {
        pushMessage("assistant", `I noticed: ${text}`);
      }, 600);
      return true;
    } catch (e) {
      console.warn("notifyAgent fallback failed", e);
      return false;
    }
  }

  // ---------- announcement logic (debounce + text composition) ----------
  function composeDetectionText(shirtHex?: string | null, shirtLabel?: string | null, dets?: any[]) {
    const parts: string[] = [];
    if (dets && dets.length > 0) {
      const names = dets.map((d: any) => d.class);
      const unique = Array.from(new Set(names));
      parts.push(`I see ${unique.slice(0, 3).join(", ")}` + (unique.length > 3 ? ", and more" : ""));
    }
    if (shirtHex) {
      parts.push(`shirt color looks like ${shirtHex} (${shirtLabel || "unknown"})`);
    }
    if (parts.length === 0) return "";
    return parts.join(". ") + ".";
  }

  function maybeAnnounceDetections(shirtHex?: string | null, shirtLabel?: string | null, dets?: any[]) {
    const text = composeDetectionText(shirtHex, shirtLabel, dets);
    if (!text) return;
    const now = Date.now();
    const last = lastSentRef.current;
    // avoid repeating identical text within 6 seconds
    if (last.text === text && last.ts && now - last.ts < 6000) return;
    // minimal rate limit: 3s between messages
    if (last.ts && now - last.ts < 3000) return;
    lastSentRef.current = { text, ts: now };

    // notify agent (returns true if delivered via SDK or fallback)
    notifyAgent(text);
  }

  // ---------- embeddings stub (unchanged from earlier) ----------
  async function sendLabelsForEmbeddings(labels: string[]) {
    try {
      console.log("Embedding labels (stub):", labels);
      return { ok: true };
    } catch (e) {
      console.error("Failed to send labels for embeddings:", e);
      return { ok: false };
    }
  }

  // ---------- webcam open/close ----------
  async function openVideo() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setVideoStream(stream);
      setVideoOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 20);
    } catch (err) {
      console.error("getUserMedia failed:", err);
      alert("Could not access camera. Check permissions.");
    }
  }

  function closeVideo() {
    stopShirtMonitor();
    stopObjectDetection();
    stopAndReleaseStream(videoStream);
    setVideoStream(null);
    setVideoOpen(false);
  }

  // ---------- lifecycle cleanup ----------
  useEffect(() => {
    return () => {
      stopAndReleaseStream(videoStream);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      stopShirtMonitor();
      stopObjectDetection();
      removeDIDScript();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- visible messages ----------
  const visibleMessages = messages.slice(-2);

  function startVoice() {
    throw new Error("Function not implemented.");
  }

  function stopVoice() {
    throw new Error("Function not implemented.");
  }

  // ---------- UI render ----------
  return (
    <div className="min-h-[calc(100vh-84px)] overflow-hidden">
      <div className="relative w-full h-[calc(100vh-84px)] bg-black flex items-stretch">
        <div className="absolute inset-0 bg-black z-0" />

        {/* Avatar / agent container */}
        <div className="absolute inset-0 flex items-center justify-center z-5 pointer-events-auto">
          <div className="w-full h-full max-h-full max-w-full flex items-center justify-center p-4">
            {conversationStarted ? (
              <div id={didContainerId} className="w-full h-full bg-black" style={{ minHeight: 320 }} />
            ) : (
              <div className="text-center pointer-events-none">
                <h2 className="text-5xl font-semibold text-white/95">AI Avatar</h2>
                <p className="text-sm text-gray-400 mt-2">
                  Your avatar will appear here. Click <span className="font-medium">Start conversation</span> below to begin.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Camera preview + controls */}
        <div className="absolute right-8 top-8 z-50 flex flex-col items-center gap-2 pointer-events-auto">
          {videoOpen ? (
            <>
              <div className="relative w-36 h-36 rounded-full overflow-hidden ring-2 ring-white/10 bg-black">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted style={{ transform: "scaleX(-1)" }} />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    width: 48,
                    height: 48,
                    left: "50%",
                    top: "62%",
                    transform: "translate(-50%,-50%)",
                    border: "2px dashed rgba(255,255,255,0.6)",
                    borderRadius: 6,
                    pointerEvents: "none",
                  }}
                />
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    if (shirtMonitorActive) stopShirtMonitor();
                    else startShirtMonitor();
                  }}
                  className="text-xs px-3 py-1 rounded bg-white/6 text-gray-200"
                >
                  {shirtMonitorActive ? "Stop Shirt" : "Monitor Shirt"}
                </button>

                <button
                  onClick={() => {
                    if (detecting) stopObjectDetection();
                    else startObjectDetection();
                  }}
                  className="text-xs px-3 py-1 rounded bg-white/6 text-gray-200"
                >
                  {detecting ? "Stop Detect" : "Start Detect"}
                </button>

                <button onClick={closeVideo} className="text-xs px-3 py-1 rounded bg-white/6 text-gray-200">
                  Close
                </button>
              </div>

              {shirtColorHex && (
                <div className="mt-2 px-2 py-1 rounded shadow-md text-xs pointer-events-none flex items-center gap-2" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, background: shirtColorHex, border: "1px solid rgba(255,255,255,0.15)" }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{shirtColorHex}</div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>{shirtBrightnessLabel}</div>
                  </div>
                </div>
              )}

              {detections.length > 0 && (
                <div className="mt-2 px-2 py-1 rounded shadow-md text-xs pointer-events-none bg-black/60 text-white max-w-xs">
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Detections</div>
                  {detections.map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div>{d.class}</div>
                      <div style={{ opacity: 0.85 }}>{Math.round(d.score * 100)}%</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-36 h-36 rounded-full overflow-hidden ring-2 ring-white/10 bg-black flex items-center justify-center text-xs text-gray-400">No camera</div>
              <div>
                <button onClick={openVideo} className="text-xs px-3 py-1 rounded bg-white/6 text-gray-200">
                  Open Camera
                </button>
              </div>
            </div>
          )}
        </div>

        {/* top-left: clear chat */}
        <div className="absolute left-8 top-8 z-40 pointer-events-auto">
          <button onClick={clearChat} className="text-xs px-3 py-1 rounded bg-white/6 text-gray-200">
            Clear Chat
          </button>
        </div>

        {/* chat overlay */}
        {chatOpen && (
          <div className="absolute left-0 right-0 bottom-36 z-40 pointer-events-none flex justify-center">
            <div className="max-w-4xl w-full px-6">
              <div className="flex flex-col items-stretch gap-1 pointer-events-auto">
                {visibleMessages.length === 0 ? (
                  <div className={`text-xs ${isDarkBackground ? "text-gray-400" : "text-gray-700"} text-center`}>Say hi to start</div>
                ) : (
                  visibleMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`text-sm ${
                        m.who === "user"
                          ? isDarkBackground
                            ? "text-white/95 self-end text-right"
                            : "text-black self-end text-right"
                          : isDarkBackground
                          ? "text-gray-300 self-start text-left"
                          : "text-gray-800 self-start text-left"
                      }`}
                    >
                      <span>{m.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* chat input */}
        {chatOpen && (
          <div className="fixed left-1/2 transform -translate-x-1/2 bottom-24 z-60 w-full max-w-4xl px-4 pointer-events-auto">
            <AssistChatInput
              onSend={(txt) => {
                if (!txt || !txt.trim()) return;
                pushMessage("user", txt.trim());
                setTimeout(() => pushMessage("assistant", `Short reply: ${txt.slice(0, 80)}`), 500);
              }}
              onClose={() => setChatOpen(false)}
            />
          </div>
        )}

        {/* Start / End conversation */}
        <div className={`absolute left-1/2 transform -translate-x-1/2 z-60 pointer-events-auto ${conversationStarted ? "bottom-12" : "bottom-20"}`}>
          {!conversationStarted ? (
            <button onClick={startConversation} className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm shadow-md">
              Start conversation
            </button>
          ) : (
            <button onClick={endConversation} className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm shadow-md">
              End conversation
            </button>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="absolute left-0 right-0 bottom-8 z-50 flex justify-center pointer-events-auto">
          <BottomActionBar
            onVideoCall={() => {
              if (videoOpen) closeVideo();
              else openVideo();
            }}
            onChatToggle={() => setChatOpen((v) => !v)}
            onVoice={() => {
              if (!voiceListening) startVoice();
              else stopVoice();
            }}
            voiceActive={voiceListening}
            chatOpen={chatOpen}
          />
        </div>
      </div>
    </div>
  );
}

// components/assist/BottomActionBar.tsx
"use client";
import React from "react";
import FloatingActionButton from "./FloatingActionButton";
import { Video, MessageCircle, Mic } from "lucide-react";

export default function BottomActionBar({
  onVideoCall,
  onChatToggle,
  onVoice,
  voiceActive = false,
  chatOpen = false,
}: {
  onVideoCall: () => void;
  onChatToggle: () => void;
  onVoice: () => void;
  voiceActive?: boolean;
  chatOpen?: boolean;
}) {
  return (
    <div className="fixed left-1/2 transform -translate-x-1/2 bottom-8 z-60 pointer-events-auto">
      <div className="flex items-center gap-6">
        <FloatingActionButton size="md" onClick={onVideoCall} ariaLabel="Open video" >
          <Video size={18} />
        </FloatingActionButton>

        {!chatOpen && (
          <FloatingActionButton size="lg" onClick={onChatToggle} className="scale-105" ariaLabel="Open chat">
            <MessageCircle size={20} />
          </FloatingActionButton>
        )}

        <FloatingActionButton size="md" onClick={onVoice} ariaLabel="Toggle voice">
          <div className="relative">
            <Mic size={16} />
            <span className={`absolute -top-2 -right-2 w-3 h-3 rounded-full border border-white/12 ${voiceActive ? "bg-rose-500 animate-pulse" : "bg-neutral-700"}`} />
          </div>
        </FloatingActionButton>
      </div>
    </div>
  );
}

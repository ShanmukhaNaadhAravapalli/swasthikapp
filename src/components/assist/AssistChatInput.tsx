// components/assist/AssistChatInput.tsx
"use client";
import React, { useState } from "react";
import { Send } from "lucide-react";

export default function AssistChatInput({
  onSend,
  onClose,
}: {
  onSend: (text: string) => void;
  onClose?: () => void;
}) {
  const [text, setText] = useState("");

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText("");
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center gap-3 bg-white/6 border border-white/8 rounded-full px-3 py-2 backdrop-blur-sm">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type to the assistant..."
            className="flex-1 bg-transparent outline-none text-sm text-gray-100 placeholder:text-gray-400"
          />
          <button type="submit" aria-label="Send" className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-white/8 hover:bg-white/12">
            <Send size={14} />
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="ml-2 text-xs text-gray-300 px-2 py-1 rounded">
              Close
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

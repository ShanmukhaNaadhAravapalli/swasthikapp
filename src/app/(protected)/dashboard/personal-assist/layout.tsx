// app/dashboard/personal-assist/layout.tsx
import React from "react";

export const metadata = {
  title: "Personal Assist",
  description: "AI personal assistant for your dashboard",
};

export default function PersonalAssistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-black text-gray-100 flex flex-col overflow-hidden">
      {/* Full immersive mode — no header, no padding */}
      <main className="flex-1 w-full h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}

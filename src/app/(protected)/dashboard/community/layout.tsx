// app/dashboard/community/layout.tsx
import React from "react";

export const metadata = { title: "Community Support", description: "Peer-to-peer community support feed" };

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">{children}</div>
    </div>
  );
}

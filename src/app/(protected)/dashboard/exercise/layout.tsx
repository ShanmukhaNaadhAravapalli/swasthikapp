import "@/styles/events_index.css";
import React from "react";
export const metadata = {
  title: "Mentra",
  description: "Mental Training & Meditation Exercises",
};

// src/app/(protected)/dashboard/events/layout.tsx
export default function DashboardEventsLayout({ children }: { children: React.ReactNode }) {
  return (
    // use fragment or a container element — do not include <html> or <body>
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
// components/dashboard/DashboardLayout.tsx
"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { LayoutDashboard, Bot, Users, Calendar, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import DashboardUserButton from "@/components/ui/dashboard-user-button"; // Import the user button

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-6 w-6 flex-shrink-0" />,
    },
    {
      label: "Personal Assist",
      href: "/dashboard/personal-assist",
      icon: <Bot className="h-6 w-6 flex-shrink-0" />,
    },
    {
      label: "Community Support",
      href: "/dashboard/community",
      icon: <Users className="h-6 w-6 flex-shrink-0" />,
    },
    {
      label: "Exercises",
      href: "/dashboard/exercise",
      icon: <BrainCircuit className="h-6 w-6 flex-shrink-0" />,
    },
    {
      label: "AI Agent Booking",
      href: "/dashboard/booking",
      icon: <Calendar className="h-6 w-6 flex-shrink-0" />,
    },
  ];

  const [open, setOpen] = useState(false);

  return (
    <div className="w-full min-h-screen bg-[#18181C] flex">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Removed Logo/LogoIcon components - keeping space for alignment */}
            <div className="h-12 py-2"> {/* Maintains the same height as the original logo */}
              {/* Empty div to maintain spacing */}
            </div>
            <div className="mt-8 flex flex-col gap-4">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="border-t border-[#2A2D2E] pt-4 px-0">
            <DashboardUserButton isExpanded={open} />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
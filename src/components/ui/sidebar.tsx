// components/ui/sidebar.tsx
"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-screen px-4 py-6 hidden md:flex md:flex-col bg-[#1A1D1E] border-r border-[#2A2D2E] w-[280px] flex-shrink-0 backdrop-blur-xl",
        className
      )}
      animate={{
        width: animate ? (open ? "280px" : "70px") : "280px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-16 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-[#1A1D1E] border-b border-[#2A2D2E] w-full backdrop-blur-xl"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-gray-300 hover:text-white cursor-pointer transition-colors duration-200"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-[#18181C] p-10 z-[100] flex flex-col justify-between backdrop-blur-xl",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-gray-300 hover:text-white cursor-pointer transition-colors duration-200"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-3 px-3 rounded-lg transition-all duration-500 ease-out relative overflow-hidden",
        "hover:bg-white/[0.03]",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/[0.02] before:to-transparent",
        "before:opacity-0 before:transition-opacity before:duration-500 before:ease-out",
        "hover:before:opacity-100",
        "after:absolute after:inset-0 after:bg-gradient-to-br after:from-slate-700/10 after:via-transparent after:to-slate-800/10",
        "after:opacity-0 after:transition-opacity after:duration-700 after:ease-out after:delay-75",
        "hover:after:opacity-100",
        className
      )}
      {...props}
    >
      <div className="relative z-10 flex items-center gap-3 w-full">
        <motion.div 
          className="text-gray-400 transition-colors duration-300 ease-out group-hover/sidebar:text-gray-200 flex-shrink-0"
          animate={{
            x: animate ? (open ? 0 : -8) : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {link.icon}
        </motion.div>
        <motion.span
          animate={{
            display: animate ? (open ? "inline-block" : "none") : "inline-block",
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          className="text-gray-300 group-hover/sidebar:text-white text-sm font-medium transition-colors duration-300 ease-out whitespace-pre inline-block !p-0 !m-0"
        >
          {link.label}
        </motion.span>
      </div>
      
      <motion.div
        className="absolute right-2 w-1 h-6 bg-gradient-to-b from-white/40 to-white/20 rounded-full opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 ease-out"
        animate={{
          display: animate ? (open ? "block" : "none") : "block",
        }}
      />

      {/* Enhanced subtle glow effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/[0.01] via-white/[0.02] to-transparent opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-700 ease-out" />
    </Link>
  );
};
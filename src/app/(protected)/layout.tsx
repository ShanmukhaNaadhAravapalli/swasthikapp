"use client";

import React from "react";

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-black text-white min-h-screen">
      {children}
    </div>
  );
};

export default ProtectedLayout;

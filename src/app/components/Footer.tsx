"use client";

import React from "react";

export const Footer = React.memo(function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
        <span>
          © {new Date().getFullYear()} ImagineHumans. All rights reserved.
        </span>
        <div className="flex gap-4">
          <a className="hover:underline" href="#">
            Privacy
          </a>
          <a className="hover:underline" href="#">
            Terms
          </a>
          <a className="hover:underline" href="#">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
});

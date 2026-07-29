"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/*
 * Theme is pinned light.
 *
 * Both surfaces this app now presents are light-only by design: the migrated
 * shell reproduces a light system pixel for pixel, and the Settings screens are
 * specified as a white interface. Following the OS into dark mode handed those
 * surfaces shadcn's dark tokens — white label text on white cards — and the
 * toggle that used to switch back left with the old header. Until a dark form
 * of both surfaces exists, this is the honest setting rather than a
 * half-inverted one.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider delay={200}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

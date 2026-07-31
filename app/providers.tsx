"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/*
 * Theme follows the OS by default and can be overridden from the top bar.
 *
 * This was previously pinned light, because dark mode handed both surfaces
 * shadcn's generic dark tokens and produced white-on-white text. Both now have
 * a designed dark form of their own — see the `.dark .lg-shell` and
 * `.dark .st-scope` blocks in globals.css — so the pin is gone.
 *
 * `disableTransitionOnChange` suppresses colour transitions for the frame in
 * which the class flips: without it every element with a colour transition
 * animates at once and the switch reads as a smear rather than a change.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delay={200}>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

/**
 * Light / Dark / System.
 *
 * Both icons in the default trigger always render; Tailwind's `dark:` variant
 * (driven by the `.dark` class next-themes sets before hydration) handles the
 * swap purely in CSS, so there's no server/client mismatch and no need to gate
 * on a "mounted" state.
 *
 * The tick beside the active option is a different matter: `theme` is genuinely
 * unknown until the client reads storage. It is safe here only because dropdown
 * contents mount on open, which is always after hydration.
 *
 * `trigger` exists so the control can wear the chrome of whatever bar it sits
 * in — the legacy top bar has its own icon treatment and a shadcn button would
 * read as a transplant — without a second copy of the menu.
 */
export function ThemeToggle({ trigger }: { trigger?: React.ReactElement }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon" aria-label="Toggle theme">
              <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
              <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            </Button>
          )
        }
      />
      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon className="size-4" />
            {option.label}
            {theme === option.value && <Check className="ml-auto size-3.5" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

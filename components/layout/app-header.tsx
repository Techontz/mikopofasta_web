import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import { CommandPalette } from "@/components/layout/command-palette";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { AuthenticatedUser } from "@/types/auth";
import type { Branch } from "@/types/branch";
import type { AppNotification } from "@/types/notification";

interface AppHeaderProps {
  user: AuthenticatedUser;
  branches: Branch[];
  notifications: AppNotification[];
}

export function AppHeader({ user, branches, notifications }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger className="shrink-0" />
      <Separator orientation="vertical" className="mr-1 h-5 shrink-0" />
      {/* Breadcrumbs must be allowed to shrink and truncate, otherwise a long
          trail (e.g. "Repayments & Collections › Reconciliation") pushes the
          header controls past the viewport on narrow screens. */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <Breadcrumbs />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <CommandPalette user={user} />
        <BranchSwitcher branches={branches} user={user} />
        <ThemeToggle />
        <NotificationsMenu notifications={notifications} />
        <Separator orientation="vertical" className="h-5" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

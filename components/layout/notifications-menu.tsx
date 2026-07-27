"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/feedback/empty-state";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationTone } from "@/types/notification";

const TONE_DOT: Record<NotificationTone, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export function NotificationsMenu({ notifications }: { notifications: AppNotification[] }) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" aria-hidden />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            Notifications
            {unreadCount > 0 && <span className="text-xs font-normal text-muted-foreground">{unreadCount} unread</span>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <EmptyState title="You're all caught up" className="border-none p-4" />
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} className="flex items-start gap-2 py-2">
              <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT[notification.tone])} aria-hidden />
              <div className="flex-1 space-y-0.5">
                <p className={cn("text-sm", !notification.read && "font-medium")}>{notification.title}</p>
                <p className="text-xs text-muted-foreground">{notification.description}</p>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

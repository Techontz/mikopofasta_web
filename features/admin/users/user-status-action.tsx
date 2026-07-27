"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setUserStatus } from "@/features/admin/users/users-actions";
import type { MockCredential } from "@/lib/mock-data/users";

export function UserStatusAction({ user }: { user: MockCredential }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      className={user.status === "active" ? "text-destructive hover:text-destructive" : undefined}
      onClick={() =>
        startTransition(async () => {
          const result = await setUserStatus(user.id, user.status === "active" ? "suspended" : "active");
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {user.status === "active" ? "Disable" : "Enable"}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/settings/form";
import { setUserStatus } from "@/features/admin/users/users-actions";
import type { User } from "@/types/user";

export function UserStatusAction({ user }: { user: User }) {
  const [pending, startTransition] = useTransition();
  const active = user.status === "active";

  return (
    <Button
      // Disabling an account is destructive; re-enabling one is not.
      tone={active ? "danger" : "secondary"}
      loading={pending}
      aria-label={`${active ? "Disable" : "Enable"} ${user.name}`}
      onClick={() =>
        startTransition(async () => {
          const result = await setUserStatus(user.id, active ? "suspended" : "active");
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      {active ? "Disable" : "Enable"}
    </Button>
  );
}

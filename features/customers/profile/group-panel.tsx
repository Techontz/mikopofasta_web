import { Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import type { Group, GroupMember } from "@/types/group";

export function GroupPanel({ customerId, group, membership }: { customerId: string; group: Group | undefined; membership: GroupMember | undefined }) {
  if (!group || !membership) {
    return <EmptyState icon={Users2} title="Not part of any group" description="This customer is registered as an individual borrower." />;
  }

  const isLeader = group.leaderCustomerId === customerId;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Users2 className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{group.name}</p>
        {isLeader && <Badge>Group Leader</Badge>}
        <Badge variant={membership.status === "active" ? "default" : "secondary"} className="ml-auto capitalize">
          {membership.status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">Joined {new Date(membership.joinedAt).toLocaleDateString()}</p>
    </div>
  );
}

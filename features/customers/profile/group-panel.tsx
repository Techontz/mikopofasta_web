import { Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import type { GroupMemberRecord, GroupRecord } from "@/lib/api/groups";

/**
 * The group a customer belongs to, on their profile.
 *
 * `group` and `membership` come from `GET /groups`, whose index eager-loads
 * each group's active members — so one request answers "is this person in a
 * group, and what office do they hold" for anybody.
 *
 * Office comes off the membership row rather than a `leaderCustomerId` column
 * on the group: the API derives the committee from the membership, so who
 * holds office and who is recorded as holding it cannot disagree.
 */
export function GroupPanel({
  group,
  membership,
}: {
  group: GroupRecord | undefined;
  membership: GroupMemberRecord | undefined;
}) {
  if (!group || !membership) {
    return <EmptyState icon={Users2} title="Not part of any group" description="This customer is registered as an individual borrower." />;
  }

  const office = membership.role === "member" ? null : membership.roleLabel;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Users2 className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{group.name}</p>
        {office && <Badge>{office}</Badge>}
        <Badge variant={membership.status === "active" ? "default" : "secondary"} className="ml-auto capitalize">
          {membership.status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">Joined {new Date(membership.joinedAt).toLocaleDateString()}</p>
    </div>
  );
}

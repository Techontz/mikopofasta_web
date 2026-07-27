import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { MOCK_JOURNAL_ENTRIES } from "@/lib/mock-data/journal-entries";
import { MOCK_REVERSAL_REQUESTS } from "@/lib/mock-data/reversals";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { SectionNav } from "@/features/ledger/section-nav";
import { ledgerNavFor } from "@/features/ledger/nav-items";
import { ReversalsPanel, type ReversalRow } from "@/features/ledger/reversals-panel";
import { entryAmount } from "@/features/ledger/queries";

export default async function ReversalsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));

  const rows: ReversalRow[] = MOCK_REVERSAL_REQUESTS.map((r) => {
    const entry = MOCK_JOURNAL_ENTRIES.find((e) => e.id === r.journalEntryId);
    return {
      id: r.id,
      entryId: r.journalEntryId,
      entryNumber: entry?.entryNumber ?? r.journalEntryId,
      entryDescription: entry?.description ?? "—",
      amount: entryAmount(r.journalEntryId),
      reason: r.reason,
      requestedByName: userNames[r.requestedBy] ?? r.requestedBy,
      requestedById: r.requestedBy,
      decidedByName: r.approvedBy ? (userNames[r.approvedBy] ?? r.approvedBy) : null,
      status: r.status,
    };
  });

  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");
  const canApprove = hasPermission(user, PERMISSIONS.LEDGER_REVERSE_APPROVE);

  return (
    <div className="space-y-6">
      <div>
        <h1>Reversals</h1>
        <p className="text-sm text-muted-foreground">
          Requesting and approving a reversal are separate permissions held by different roles. Approval posts a new,
          mirrored entry — the original is never touched.
        </p>
      </div>

      <SectionNav items={ledgerNavFor(user)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Approval ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ReversalsPanel requests={pending} canApprove={canApprove} currentUserId={user.id} />
        </CardContent>
      </Card>

      {decided.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decided ({decided.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ReversalsPanel requests={decided} canApprove={canApprove} currentUserId={user.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

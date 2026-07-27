import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { MOCK_JOURNAL_ENTRIES } from "@/lib/mock-data/journal-entries";
import { SectionNav } from "@/features/ledger/section-nav";
import { ledgerNavFor } from "@/features/ledger/nav-items";
import { EntriesTable } from "@/features/ledger/entries-table";
import { toEntryRow } from "@/features/ledger/queries";

export default async function JournalEntriesPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  const rows = [...MOCK_JOURNAL_ENTRIES]
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .map(toEntryRow);

  return (
    <div className="space-y-6">
      <div>
        <h1>Journal Entries</h1>
        <p className="text-sm text-muted-foreground">Every posting in the system, newest first. Entries are never edited or deleted.</p>
      </div>

      <SectionNav items={ledgerNavFor(user)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Entries ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <EntriesTable entries={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

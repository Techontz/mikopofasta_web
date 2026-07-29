import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getAllJournalEntries } from "@/lib/api/ledger";
import { SectionNav } from "@/features/ledger/section-nav";
import { ledgerNavFor } from "@/features/ledger/nav-items";
import { EntriesTable } from "@/features/ledger/entries-table";
import { reversedEntryIds, toEntryRow } from "@/features/ledger/queries";

export default async function JournalEntriesPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.LEDGER_VIEW)) return <AccessDeniedState />;

  // The API already returns newest-first (ordered by posted_at), so no local
  // re-sort — and each entry arrives with its lines, so the row's amount and
  // line count are the server's figures, not a second tally.
  const entries = await getAllJournalEntries();
  const reversed = reversedEntryIds(entries);
  const rows = entries.map((entry) => toEntryRow(entry, reversed));

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

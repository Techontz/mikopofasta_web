import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { AccessDeniedState } from "@/components/feedback/access-denied-state";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { getPerformanceRecords } from "@/lib/api/hr";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { SectionNav } from "@/features/ledger/section-nav";
import { hrNavFor } from "@/features/hr/nav-items";

const RATING_TONE: Record<string, "default" | "secondary" | "destructive"> = {
  A: "default",
  B: "secondary",
  C: "secondary",
  D: "destructive",
};

export default async function PerformancePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, PERMISSIONS.HR_VIEW)) return <AccessDeniedState />;

  // The API already returns newest-period-first, and each record carries the
  // employee's name. `recordedBy` is a user id with no name on the resource —
  // /users needs `users.manage`, which HR-viewing roles do not hold — so the
  // reviewer falls back to the seeded user list until Users is integrated.
  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));
  const records = await getPerformanceRecords();

  return (
    <div className="space-y-6">
      <div>
        <h1>Performance</h1>
        <p className="text-sm text-muted-foreground">Targets versus achieved per period, with the reviewer&apos;s rating.</p>
      </div>

      <SectionNav items={hrNavFor(user)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Records ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <EmptyState title="No performance records" description="Managers record targets and achievement per period." />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Loans disbursed</TableHead>
                    <TableHead>Collection rate</TableHead>
                    <TableHead>New customers</TableHead>
                    <TableHead>Recorded by</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link href={`/hr/staff/${r.staffProfileId}`} className="font-medium hover:underline">
                          {(r.staffName ?? r.staffProfileId)}
                        </Link>
                      </TableCell>
                      <TableCell>{r.period}</TableCell>
                      <TableCell className="font-tabular">
                        {r.achieved.loans_disbursed} / {r.targets.loans_disbursed}
                      </TableCell>
                      <TableCell className="font-tabular">
                        {r.achieved.collection_rate_pct}% / {r.targets.collection_rate_pct}%
                      </TableCell>
                      <TableCell className="font-tabular">
                        {r.achieved.new_customers} / {r.targets.new_customers}
                      </TableCell>
                      <TableCell>{userNames[r.recordedBy] ?? r.recordedBy}</TableCell>
                      <TableCell>
                        <Badge variant={r.rating ? RATING_TONE[r.rating] : "secondary"}>{r.rating ?? "—"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

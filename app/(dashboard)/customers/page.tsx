import { AlertTriangle, ShieldCheck, Snowflake, UserCheck, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllCustomers } from "@/lib/api/customers";
import { CustomersTable } from "@/features/customers/customers-table";
import { toCustomerRow } from "@/features/customers/view-models";

export default async function CustomersPage() {
  // Already narrowed to what this officer may see — §13 branch scoping is the
  // API's, so the page does no filtering of its own. Soft-deleted customers are
  // excluded unless `include_deleted` is asked for, which this screen does not.
  const customers = await getAllCustomers();
  const rows = customers.map(toCustomerRow);

  const tiles = [
    { label: "Total Customers", value: customers.length, icon: Users },
    { label: "KYC Completed", value: customers.filter((c) => c.kycStatus === "completed").length, icon: ShieldCheck },
    { label: "Pending Approval", value: customers.filter((c) => c.approvalStatus === "pending").length, icon: UserCheck },
    { label: "Frozen / Suspended", value: customers.filter((c) => c.status !== "active").length, icon: Snowflake },
  ];

  const pendingKyc = customers.filter((c) => c.kycStatus === "incomplete").length;

  return (
    <div className="space-y-6">
      <div>
        <h1>Customers & KYC</h1>
        <p className="text-sm text-muted-foreground">Onboard, verify, and manage the full customer lifecycle.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.label}</CardTitle>
              <tile.icon className="size-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="font-tabular text-2xl font-semibold">{tile.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingKyc > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span>
            {pendingKyc} customer{pendingKyc === 1 ? "" : "s"} {pendingKyc === 1 ? "has" : "have"} incomplete KYC and cannot yet apply for a loan.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomersTable customers={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

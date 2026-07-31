import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCustomer,
  getCustomerCategories,
  getCustomerDocuments,
  getCustomerNotes,
  getGuarantors,
  getKycStatus,
  getNextOfKin,
} from "@/lib/api/customers";
import { getBranches, getDistricts, getRegions, getStreets, getWards } from "@/lib/api/organization";
import { ApiError } from "@/lib/api/errors";
import { MOCK_ACCOUNT_FREEZES } from "@/lib/mock-data/account-freezes";
import { getAuditLogs } from "@/lib/api/system-configuration";
import { MOCK_GROUPS, MOCK_GROUP_MEMBERS } from "@/lib/mock-data/groups";
import { MOCK_USERS } from "@/lib/mock-data/users";
import { buildCustomerTimeline } from "@/lib/domain/customer-timeline";
import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/config/permissions";
import { PERMISSIONS } from "@/types/auth";
import { customerFullName } from "@/types/customer";
import { CustomerHeader } from "@/features/customers/profile/customer-header";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { OverviewPanel } from "@/features/customers/profile/overview-panel";
import { TimelinePanel } from "@/features/customers/profile/timeline-panel";
import { KycChecklistPanel } from "@/features/customers/profile/kyc-checklist-panel";
import { DocumentsPanel } from "@/features/customers/profile/documents-panel";
import { NotesPanel } from "@/features/customers/profile/notes-panel";
import { GuarantorsPanel } from "@/features/customers/profile/guarantors-panel";
import { NextOfKinPanel } from "@/features/customers/profile/next-of-kin-panel";
import { GroupPanel } from "@/features/customers/profile/group-panel";
import { AuditTrailPanel } from "@/features/customers/profile/audit-trail-panel";

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // A customer outside this officer's branch scope comes back 403, a missing
  // one 404. Both mean "no such profile, for you" and belong on the not-found
  // page rather than the error boundary.
  let customer;
  try {
    customer = await getCustomer(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }

  const user = await getCurrentUser();
  const canManage = user ? hasPermission(user, PERMISSIONS.CUSTOMERS_MANAGE) : false;
  const canApprove = user ? hasPermission(user, PERMISSIONS.CUSTOMERS_APPROVE) : false;

  const [kyc, documents, notes, guarantors, nextOfKin, categories, branches] = await Promise.all([
    getKycStatus(id),
    getCustomerDocuments(id),
    getCustomerNotes(id),
    getGuarantors(id),
    getNextOfKin(id),
    getCustomerCategories(),
    getBranches(),
  ]);

  // The address chain is resolved one level at a time, each filtered by the
  // level above, rather than pulling every street in the country to name one.
  const [regions, districts, wards, streets] = await Promise.all([
    getRegions(),
    customer.districtId ? getDistricts(customer.regionId ?? undefined) : Promise.resolve([]),
    customer.wardId ? getWards(customer.districtId ?? undefined) : Promise.resolve([]),
    customer.streetId ? getStreets(customer.wardId ?? undefined) : Promise.resolve([]),
  ]);

  const branch = branches.find((b) => b.id === customer.branchId);
  const category = categories.find((c) => c.id === customer.customerCategoryId);
  const region = regions.find((r) => r.id === customer.regionId);
  const district = districts.find((d) => d.id === customer.districtId);
  const ward = wards.find((w) => w.id === customer.wardId);
  const street = streets.find((s) => s.id === customer.streetId);

  // Freezes, the audit trail and groups have no endpoint in this phase, so they
  // stay on seeded data and read empty for API-registered customers.
  const freezes = MOCK_ACCOUNT_FREEZES.filter((f) => f.freezableType === "customer" && f.freezableId === customer.id);
  /*
   * This record's own history, from the audit trail.
   *
   * The whole trail needs `audit.view`; a read pinned to one record is
   * authorised against the record's own policy instead, so anyone who may see
   * this page may see how it got here. An empty list if that read is refused —
   * the panel is context, not the reason the page exists.
   */
  const auditLogs = await getAuditLogs({
    auditableType: "Customer",
    auditableId: customer.id,
    perPage: 100,
  })
    .then((result) => result.logs)
    .catch(() => []);
  const membership = MOCK_GROUP_MEMBERS.find((m) => m.customerId === customer.id);
  const group = membership ? MOCK_GROUPS.find((g) => g.id === membership.groupId) : undefined;

  const userNames = Object.fromEntries(MOCK_USERS.map((u) => [u.id, u.name]));
  const timeline = buildCustomerTimeline(customer, documents, notes, freezes, auditLogs);

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label={customerFullName(customer)} />
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/customers"><ArrowLeft className="size-4" />Back to Customers</Link>} />

      <Card>
        <CardContent className="pt-6">
          <CustomerHeader customer={customer} canManage={canManage} canApprove={canApprove} />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
          <TabsTrigger value="guarantors">Guarantors ({guarantors.length})</TabsTrigger>
          <TabsTrigger value="next-of-kin">Next of Kin ({nextOfKin.length})</TabsTrigger>
          <TabsTrigger value="group">Group</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              {/* Bank details are write-only in this API — the KYC panel reads the
                  server's own checklist rather than inferring them here. */}
              <OverviewPanel customer={customer} branch={branch} category={category} region={region} district={district} ward={ward} street={street} bankDetails={undefined} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc">
          <Card>
            <CardContent className="pt-6">
              <KycChecklistPanel kyc={kyc} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="pt-6">
              <TimelinePanel events={timeline} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="pt-6">
              <DocumentsPanel customerId={customer.id} documents={documents} missingDocuments={kyc.missingDocuments} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6">
              <NotesPanel customerId={customer.id} notes={notes} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guarantors">
          <Card>
            <CardContent className="pt-6">
              <GuarantorsPanel customerId={customer.id} guarantors={guarantors} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="next-of-kin">
          <Card>
            <CardContent className="pt-6">
              <NextOfKinPanel customerId={customer.id} records={nextOfKin} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group">
          <Card>
            <CardContent className="pt-6">
              <GroupPanel customerId={customer.id} group={group} membership={membership} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="pt-6">
              <AuditTrailPanel logs={auditLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

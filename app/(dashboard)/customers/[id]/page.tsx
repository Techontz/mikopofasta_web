import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCK_CUSTOMERS } from "@/lib/mock-data/customers";
import { MOCK_BRANCHES } from "@/lib/mock-data/branches";
import { MOCK_CUSTOMER_CATEGORIES } from "@/lib/mock-data/customer-categories";
import { REGIONS } from "@/lib/mock-data/regions";
import { DISTRICTS } from "@/lib/mock-data/districts";
import { WARDS } from "@/lib/mock-data/wards";
import { STREETS } from "@/lib/mock-data/streets";
import { MOCK_CUSTOMER_BANK_DETAILS } from "@/lib/mock-data/customer-bank-details";
import { MOCK_CUSTOMER_DOCUMENTS } from "@/lib/mock-data/customer-documents";
import { MOCK_CUSTOMER_NOTES } from "@/lib/mock-data/customer-notes";
import { MOCK_GUARANTORS } from "@/lib/mock-data/guarantors";
import { MOCK_NEXT_OF_KIN } from "@/lib/mock-data/next-of-kin";
import { MOCK_ACCOUNT_FREEZES } from "@/lib/mock-data/account-freezes";
import { MOCK_AUDIT_LOGS } from "@/lib/mock-data/audit-logs";
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
  const customer = MOCK_CUSTOMERS.find((c) => c.id === id && c.deletedAt === null);
  if (!customer) notFound();

  const user = await getCurrentUser();
  const canManage = user ? hasPermission(user, PERMISSIONS.CUSTOMERS_MANAGE) : false;
  const canApprove = user ? hasPermission(user, PERMISSIONS.CUSTOMERS_APPROVE) : false;

  const branch = MOCK_BRANCHES.find((b) => b.id === customer.branchId);
  const category = MOCK_CUSTOMER_CATEGORIES.find((c) => c.id === customer.customerCategoryId);
  const region = REGIONS.find((r) => r.id === customer.regionId);
  const district = DISTRICTS.find((d) => d.id === customer.districtId);
  const ward = WARDS.find((w) => w.id === customer.wardId);
  const street = STREETS.find((s) => s.id === customer.streetId);
  const bankDetails = MOCK_CUSTOMER_BANK_DETAILS.find((b) => b.customerId === customer.id);
  const documents = MOCK_CUSTOMER_DOCUMENTS.filter((d) => d.customerId === customer.id);
  const notes = MOCK_CUSTOMER_NOTES.filter((n) => n.customerId === customer.id);
  const guarantors = MOCK_GUARANTORS.filter((g) => g.customerId === customer.id);
  const nextOfKin = MOCK_NEXT_OF_KIN.filter((k) => k.customerId === customer.id);
  const freezes = MOCK_ACCOUNT_FREEZES.filter((f) => f.freezableType === "customer" && f.freezableId === customer.id);
  const auditLogs = MOCK_AUDIT_LOGS.filter((l) => l.auditableType === "customer" && l.auditableId === customer.id);
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
              <OverviewPanel customer={customer} branch={branch} category={category} region={region} district={district} ward={ward} street={street} bankDetails={bankDetails} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc">
          <Card>
            <CardContent className="pt-6">
              <KycChecklistPanel customer={customer} hasBankDetails={Boolean(bankDetails)} />
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
              <DocumentsPanel customerId={customer.id} documents={documents} requiredDocuments={category?.requiredDocuments ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6">
              <NotesPanel customerId={customer.id} notes={notes} authorNames={userNames} />
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
              <AuditTrailPanel logs={auditLogs} actorNames={userNames} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

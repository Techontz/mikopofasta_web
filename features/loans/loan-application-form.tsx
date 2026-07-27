"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatMoney } from "@/lib/domain/money";
import { generateLoanSchedule } from "@/lib/domain/loan-schedule";
import { checkLoanApplication, effectiveMaxAmount } from "@/lib/domain/loan-eligibility";
import { applyForLoan } from "@/features/loans/actions";
import type { Customer } from "@/types/customer";
import type { CategoryProductEligibility, InterestFormula, LoanProduct, LoanProductRepaymentSchedule, RepaymentSchedule } from "@/types/loan-product";
import type { Loan } from "@/types/loan";

const NONE = "__none__";

interface Props {
  customers: Customer[];
  products: LoanProduct[];
  schedules: RepaymentSchedule[];
  formulas: InterestFormula[];
  eligibility: CategoryProductEligibility[];
  productSchedules: LoanProductRepaymentSchedule[];
  openLoans: Loan[];
}

export function LoanApplicationForm({ customers, products, schedules, formulas, eligibility, productSchedules, openLoans }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customerId, setCustomerId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [scheduleId, setScheduleId] = React.useState("");
  const [principal, setPrincipal] = React.useState("");
  const [tenure, setTenure] = React.useState("");

  const customer = customers.find((c) => c.id === customerId);
  const product = products.find((p) => p.id === productId);
  const schedule = schedules.find((s) => s.id === scheduleId);

  // Only products this customer's category is actually eligible for (§6).
  const availableProducts = React.useMemo(() => {
    if (!customer) return [];
    const allowedIds = new Set(
      eligibility.filter((e) => e.customerCategoryId === customer.customerCategoryId).map((e) => e.loanProductId)
    );
    return products.filter((p) => allowedIds.has(p.id) && p.status === "active");
  }, [customer, eligibility, products]);

  // Only schedules the chosen product permits (§2.3 pivot).
  const availableSchedules = React.useMemo(() => {
    if (!product) return [];
    const allowedIds = new Set(
      productSchedules.filter((ps) => ps.loanProductId === product.id).map((ps) => ps.repaymentScheduleId)
    );
    return schedules.filter((s) => allowedIds.has(s.id));
  }, [product, productSchedules, schedules]);

  const rule = customer && product ? eligibility.find((e) => e.customerCategoryId === customer.customerCategoryId && e.loanProductId === product.id) : undefined;
  const maxAmount = product ? effectiveMaxAmount(product, rule) : 0;

  const principalNumber = Number(principal) || 0;
  const tenureNumber = Number(tenure) || 0;

  const violations = React.useMemo(() => {
    if (!customer || !product || !scheduleId || !principalNumber || !tenureNumber) return [];
    return checkLoanApplication({
      customer,
      product,
      repaymentScheduleId: scheduleId,
      principalAmount: principalNumber,
      tenureDays: tenureNumber,
      eligibility,
      productSchedules,
      openLoans: openLoans.filter((l) => l.customerId === customer.id),
    });
  }, [customer, product, scheduleId, principalNumber, tenureNumber, eligibility, productSchedules, openLoans]);

  const preview = React.useMemo(() => {
    if (!product || !schedule || !principalNumber || !tenureNumber || violations.length > 0) return [];
    const formula = formulas.find((f) => f.id === product.interestFormulaId);
    if (!formula) return [];
    return generateLoanSchedule({
      loanId: "preview",
      principalAmount: principalNumber,
      interestRate: product.interestRate,
      tenureDays: tenureNumber,
      frequencyDays: schedule.frequencyDays,
      interestFormulaCode: formula.code,
      startDate: new Date(),
    });
  }, [product, schedule, principalNumber, tenureNumber, formulas, violations]);

  const totals = preview.reduce(
    (acc, i) => ({ principal: acc.principal + i.principalDue, interest: acc.interest + i.interestDue }),
    { principal: 0, interest: 0 }
  );

  const canSubmit = Boolean(customer && product && scheduleId && principalNumber && tenureNumber) && violations.length === 0;

  function handleSubmit() {
    startTransition(async () => {
      const result = await applyForLoan({
        customerId,
        loanProductId: productId,
        repaymentScheduleId: scheduleId,
        principalAmount: principalNumber,
        tenureDays: tenureNumber,
      });
      if (!result.ok) {
        toast.error(result.message ?? "Could not submit the application.");
        return;
      }
      toast.success(result.message);
      router.push(result.loanId ? `/loans/${result.loanId}` : "/loans");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Customer</Label>
            <Select
              value={customerId || NONE}
              onValueChange={(v) => {
                setCustomerId(v === NONE ? "" : (v ?? ""));
                setProductId("");
                setScheduleId("");
              }}
            >
              <SelectTrigger aria-label="Customer" className="w-full">
                <SelectValue placeholder="Select a KYC-completed customer">
                  {(v: string) => {
                    const c = customers.find((x) => x.id === v);
                    return c ? `${c.firstName} ${c.lastName} — ${c.customerNumber}` : "Select a KYC-completed customer";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-muted-foreground">
                  Select a KYC-completed customer
                </SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} — {c.customerNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customers.length === 0 && (
              <p className="text-xs text-muted-foreground">No eligible customers in your branch — complete a customer&apos;s KYC first.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Loan Product</Label>
            <Select
              value={productId || NONE}
              onValueChange={(v) => {
                setProductId(v === NONE ? "" : (v ?? ""));
                setScheduleId("");
              }}
              disabled={!customer}
            >
              <SelectTrigger aria-label="Loan product" className="w-full">
                <SelectValue placeholder={customer ? "Select product" : "Select a customer first"}>
                  {(v: string) => products.find((p) => p.id === v)?.name ?? (customer ? "Select product" : "Select a customer first")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-muted-foreground">
                  {customer ? "Select product" : "Select a customer first"}
                </SelectItem>
                {availableProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {customer && availableProducts.length === 0 && (
              <p className="text-xs text-destructive">This customer&apos;s category isn&apos;t eligible for any active product.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Repayment Schedule</Label>
            <Select value={scheduleId || NONE} onValueChange={(v) => setScheduleId(v === NONE ? "" : (v ?? ""))} disabled={!product}>
              <SelectTrigger aria-label="Repayment Schedule" className="w-full">
                <SelectValue placeholder={product ? "Select schedule" : "Select a product first"}>
                  {(v: string) => schedules.find((s) => s.id === v)?.name ?? (product ? "Select schedule" : "Select a product first")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE} className="text-muted-foreground">
                  {product ? "Select schedule" : "Select a product first"}
                </SelectItem>
                {availableSchedules.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} (every {s.frequencyDays}d)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="principal">Principal Amount (TZS)</Label>
            <Input id="principal" type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} disabled={!product} />
            {product && (
              <p className="text-xs text-muted-foreground">
                {formatMoney(product.minAmount)} – {formatMoney(maxAmount)}
                {rule?.maxAmountOverride != null && " (capped by customer category)"}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tenure">Tenure (days)</Label>
            <Input id="tenure" type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} disabled={!product} />
            {product && (
              <p className="text-xs text-muted-foreground">
                {product.minTenureDays} – {product.maxTenureDays} days
              </p>
            )}
          </div>

          {product && (
            <div className="sm:col-span-2 grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-3">
              <Fact label="Interest rate" value={`${product.interestRate}%`} />
              <Fact label="Interest formula" value={formulas.find((f) => f.id === product.interestFormulaId)?.name ?? "—"} />
              <Fact label="E-Mandate" value={product.requiresMandate ? "Required" : "Not required"} />
            </div>
          )}
        </CardContent>
      </Card>

      {violations.length > 0 && (
        <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <CircleAlert className="size-4" aria-hidden />
            This application can&apos;t be submitted yet
          </div>
          <ul className="ml-6 list-disc text-sm text-destructive">
            {violations.map((v) => (
              <li key={v.code}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repayment Schedule Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {preview.length === 0 ? (
            <EmptyState title="Nothing to preview yet" description="Pick a product, schedule, amount, and tenure to see the installment plan." />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Fact label="Installments" value={String(preview.length)} />
                <Fact label="Total interest" value={formatMoney(totals.interest)} />
                <Fact label="Total repayable" value={formatMoney(totals.principal + totals.interest)} />
              </div>
              <div className="max-h-72 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Due date</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((i) => (
                      <TableRow key={i.installmentNumber}>
                        <TableCell>{i.installmentNumber}</TableCell>
                        <TableCell>{i.dueDate}</TableCell>
                        <TableCell className="font-tabular">{formatMoney(i.principalDue)}</TableCell>
                        <TableCell className="font-tabular">{formatMoney(i.interestDue)}</TableCell>
                        <TableCell className="font-tabular">{formatMoney(i.principalDue + i.interestDue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!canSubmit || pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Submit Application
        </Button>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

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
import { effectiveMaxAmount } from "@/lib/domain/loan-eligibility";
import { applyForLoan, checkLoanEligibility, previewLoanSchedule } from "@/features/loans/actions";
import type { SchedulePreview } from "@/lib/api/loans";
import type { EligibilityViolation } from "@/lib/api/loans";
import type { LoanProductWithConfig } from "@/lib/api/loans";
import type { CustomerListItem } from "@/lib/api/customers";
import { ApplicantCombobox } from "@/features/loans/applicant-combobox";
import { LoanGuarantorsSection } from "@/features/loans/loan-guarantors-section";
import type { CategoryProductEligibility, InterestFormula, RepaymentSchedule } from "@/types/loan-product";

const NONE = "__none__";

interface Props {
  products: LoanProductWithConfig[];
  schedules: RepaymentSchedule[];
  formulas: InterestFormula[];
  eligibility: CategoryProductEligibility[];
  /**
   * The customer chosen on the previous screen, already confirmed
   * loan-eligible by the API — see `resolveApplicant` on the page.
   *
   * The selector used to link here carrying nothing, so the officer picked a
   * customer and was immediately asked to pick one again. There is no
   * `customers` array any more: the combobox searches the API, so this form is
   * never handed the branch's book.
   */
  initialCustomer?: CustomerListItem | null;
}

export function LoanApplicationForm({
  products,
  schedules,
  formulas,
  eligibility,
  initialCustomer,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /* The whole record, not an id resolved against a preloaded list. */
  const [customer, setCustomer] = React.useState<CustomerListItem | null>(initialCustomer ?? null);
  const customerId = customer?.id ?? "";
  const [guarantorCount, setGuarantorCount] = React.useState(0);
  const [productId, setProductId] = React.useState("");
  const [scheduleId, setScheduleId] = React.useState("");
  const [principal, setPrincipal] = React.useState("");
  const [tenure, setTenure] = React.useState("");
  const [violations, setViolations] = React.useState<EligibilityViolation[]>([]);
  const [checking, setChecking] = React.useState(false);

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

  // Only cadences the chosen product permits (§2.3). The API puts the allowed
  // ids on the product itself, so no pivot table is reconstructed here.
  const availableSchedules = React.useMemo(() => {
    if (!product) return [];
    const allowedIds = new Set(product.allowedRepaymentScheduleIds);
    return schedules.filter((s) => allowedIds.has(s.id));
  }, [product, schedules]);

  const rule = customer && product ? eligibility.find((e) => e.customerCategoryId === customer.customerCategoryId && e.loanProductId === product.id) : undefined;
  const maxAmount = product ? effectiveMaxAmount(product, rule) : 0;

  const principalNumber = Number(principal) || 0;
  const tenureNumber = Number(tenure) || 0;

  const complete = Boolean(customerId && productId && scheduleId && principalNumber && tenureNumber);

  /*
   * Eligibility is the API's answer, not a local re-implementation of §6.
   *
   * Only the server can see the customer's whole loan history, the live
   * category rules and the post-closure cooldown, and `POST /loans` applies
   * exactly these gates — so asking it here means the form can never disagree
   * with what submission will do. Debounced because it fires on every keystroke
   * in the amount and tenure fields.
   */
  React.useEffect(() => {
    let cancelled = false;

    // Every state change happens inside the timer, never synchronously in the
    // effect body — a synchronous setState here would cascade a second render
    // on each keystroke.
    const timer = setTimeout(async () => {
      if (!complete) {
        setViolations([]);
        return;
      }

      setChecking(true);

      const result = await checkLoanEligibility({
        customerId,
        loanProductId: productId,
        repaymentScheduleId: scheduleId,
        principalAmount: principalNumber,
        tenureDays: tenureNumber,
      });

      if (cancelled) return;

      setViolations(
        result.ok
          ? (result.violations ?? [])
          : [{ code: "CHECK_FAILED", message: result.message ?? "Could not check eligibility." }]
      );
      setChecking(false);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [complete, customerId, productId, scheduleId, principalNumber, tenureNumber, guarantorCount]);

  /*
   * The preview comes from the ENGINE, not from the browser.
   *
   * It used to be computed here, from a TypeScript copy of the interest
   * formulas whose own comment admitted the two "allocate rounding remainders
   * differently, so individual installments can differ by a cent or two". That
   * copy knew three formulas; the engine now implements four, and the fourth is
   * the default for new products — so a locally computed preview would have
   * shown an officer a plan priced by arithmetic the loan would never use.
   *
   * One implementation, server-side. The figures shown to a customer are the
   * figures they will owe.
   */
  /*
   * The preview is keyed by the terms it was priced for.
   *
   * Without the key, changing the amount would leave the OLD plan on screen
   * until the new one arrived — an officer reading figures for a loan they are
   * no longer applying for. Comparing the key is also what lets the effect
   * avoid clearing state synchronously, which cascades renders.
   */
  const previewKey =
    product && schedule && principalNumber && tenureNumber && violations.length === 0
      ? `${productId}|${scheduleId}|${principalNumber}|${tenureNumber}`
      : null;

  const [priced, setPriced] = React.useState<{ key: string; data: SchedulePreview } | null>(null);

  React.useEffect(() => {
    if (previewKey === null) return;

    let cancelled = false;

    // Debounced for the same reason the eligibility check is: the amount and
    // tenure fields fire on every keystroke.
    const timer = setTimeout(async () => {
      const result = await previewLoanSchedule({
        loanProductId: productId,
        repaymentScheduleId: scheduleId,
        principalAmount: principalNumber,
        tenureDays: tenureNumber,
      });

      if (cancelled) return;

      setPriced(result.ok && result.preview ? { key: previewKey, data: result.preview } : null);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [previewKey, productId, scheduleId, principalNumber, tenureNumber]);

  const preview = priced?.key === previewKey ? priced.data : null;
  const previewing = previewKey !== null && preview === null;
  const installments = preview?.installments ?? [];

  const canSubmit = complete && violations.length === 0 && !checking;

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
            <Label htmlFor="application-customer">Customer</Label>
            {/*
              The same server-searched combobox the previous screen uses, over
              `?loan_eligible=1`. It replaced a `<Select>` listing every
              customer this page had downloaded — and one whose placeholder
              said "KYC-completed", which stopped being the rule when
              registration approval became mandatory.
            */}
            <ApplicantCombobox
              id="application-customer"
              value={customerId || null}
              initialCustomer={initialCustomer}
              onChange={(next) => {
                setCustomer(next);
                /* A different borrower has a different category, so the
                   product and cadence chosen for the last one no longer apply. */
                setProductId("");
                setScheduleId("");
              }}
            />
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
                {rule?.maxAmountOverride != null && " (capped by customer type)"}
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

      {checking && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Checking eligibility…
        </p>
      )}

      {!checking && violations.length > 0 && (
        <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3" role="alert">
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
          {installments.length === 0 ? (
            <EmptyState
              title={previewing ? "Working out the plan…" : "Nothing to preview yet"}
              description={
                previewing
                  ? "Pricing this loan against the product's formula."
                  : "Pick a product, schedule, amount, and tenure to see the installment plan."
              }
            />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <Fact label="Installments" value={String(preview?.installmentCount ?? installments.length)} />
                <Fact label="Formula" value={preview?.formulaName ?? "—"} />
                <Fact label="Total interest" value={formatMoney(Number(preview?.totalInterest ?? 0))} />
                <Fact label="Total repayable" value={formatMoney(Number(preview?.totalPayable ?? 0))} />
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
                    {installments.map((i) => (
                      <TableRow key={i.installmentNumber}>
                        <TableCell>{i.installmentNumber}</TableCell>
                        <TableCell>{i.dueDate}</TableCell>
                        <TableCell className="font-tabular">{formatMoney(Number(i.principalDue))}</TableCell>
                        <TableCell className="font-tabular">{formatMoney(Number(i.interestDue))}</TableCell>
                        <TableCell className="font-tabular">{formatMoney(Number(i.totalDue))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/*
        The guarantor step, between the terms and the submit — where the
        existing paper flow puts it, and where the officer can act on the
        refusal instead of meeting it at the end with nowhere to go.

        `guarantorCount` re-runs the eligibility check when it changes: adding a
        guarantor is one of the things that can clear GUARANTORS_REQUIRED, and
        the button must not stay disabled on a stale answer.
      */}
      <LoanGuarantorsSection
        customerId={customerId}
        customerName={customer?.fullName ?? ""}
        requirementMessage={
          violations.find((v) => v.code === "GUARANTORS_REQUIRED")?.message ?? null
        }
        onCountChange={setGuarantorCount}
      />

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

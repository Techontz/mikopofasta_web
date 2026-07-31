const TZS_FORMATTER = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return TZS_FORMATTER.format(amount);
}

/*
 * TZS cents are not used in day-to-day amounts, which is why formatMoney drops
 * them — the legacy screens print 350,000, never 350,000.00.
 *
 * Some figures do carry a fraction, though: payroll pro-rates a salary and
 * commission splits a pool, so a payslip can be 1,335,950.15. Rounding those to
 * whole shillings for display makes a column stop footing — eleven rounded
 * payslips summed a shilling short of their (correctly rounded) total, which in
 * a payroll table reads as a bug even though the data is exact.
 *
 * So: cents appear only when they exist. A whole amount is still printed whole,
 * and a column of amounts that foots exactly keeps footing on screen.
 */
const TZS_FORMATTER_EXACT = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoneyExact(amount: number): string {
  return Number.isInteger(round2(amount)) ? TZS_FORMATTER.format(amount) : TZS_FORMATTER_EXACT.format(amount);
}

export function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

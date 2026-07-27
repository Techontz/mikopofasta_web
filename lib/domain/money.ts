const TZS_FORMATTER = new Intl.NumberFormat("en-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return TZS_FORMATTER.format(amount);
}

export function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

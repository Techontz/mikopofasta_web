/** The M-Kopa Credit logo ("Wewe Kwanza"), shown wherever the app displays its brand. */
export const BRAND_LOGO = "/assets/img/mkopa-credit-logo.png";

export const BRAND_NAME = "M-Kopa Credit";

/**
 * Brand palette — red, black and white — for dashboard charts, icon tiles and legends. The values are CSS variables
 * (styles/credit-dashboard.css), so they follow the light and the dark theme.
 */
export const BRAND = {
  red: "var(--brand-red)",
  redDark: "var(--brand-red-dark)",
  redLight: "var(--brand-red-light)",
  black: "var(--brand-black)",
  greyDark: "var(--brand-grey-dark)",
  grey: "var(--brand-grey)",
  greyLight: "var(--brand-grey-light)",
} as const;

/** Distinct colours for categories (donut slices, stacked items), in the order they are used. */
export const BRAND_SERIES = [BRAND.red, BRAND.black, BRAND.grey, BRAND.redLight, BRAND.greyDark, BRAND.redDark, BRAND.greyLight];

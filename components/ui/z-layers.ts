/**
 * The application's stacking order, stated once.
 *
 * Every overlay in the app is portalled to `document.body`, so nothing here is
 * about escaping a card's `overflow-hidden` — that is already solved by the
 * portal. This file exists because of the *other* half of the problem: two
 * portalled siblings at the SAME z-index fall back to DOM order, and DOM order
 * is decided by whichever thing happened to open last.
 *
 * That was the live bug. Dialogs, selects, popovers, dropdown menus, tooltips
 * AND the mobile sidebar drawer were all `z-50`. A select inside a dialog
 * rendered above it only because Base UI mounts a portal on open, so the select
 * happened to land later in the body. Nothing enforced it. Reorder a mount,
 * keep a portal alive between opens, or open a dialog while the mobile drawer
 * is showing, and the overlay disappears *behind* the thing it belongs to —
 * which reads to a user as "the dropdown is hidden under the card".
 *
 * The scale below removes every tie. Each layer is strictly above the one it
 * can legitimately appear on top of:
 *
 *   40  mobile nav backdrop
 *   50  mobile sidebar drawer          — above the backdrop it dims
 *   60  dialogs and alert dialogs      — above the drawer, so a modal opened
 *                                        from the mobile menu is reachable
 *   70  floating layer                 — select, popover, dropdown menu,
 *                                        combobox. Above dialogs, because
 *                                        every one of them can be opened from
 *                                        inside a form in a dialog
 *   80  tooltips                       — above everything; a tooltip describes
 *                                        whatever is on top and is never
 *                                        interactive, so it cannot trap anything
 *
 * Written as bracket values (`z-[60]`) rather than `z-60`: Tailwind's default
 * scale stops at 50, and an unrecognised `z-60` silently emits nothing — which
 * would reintroduce the exact tie this file removes.
 *
 * FloatingPanel positions inline rather than with a class (it computes `top`,
 * `left` and `maxHeight` in the same style object), so it carries the numeric
 * value from `FLOATING_LAYER` instead of the class string.
 */

/** Tailwind classes. Used by the primitives in `components/ui/`. */
export const Z = {
  mobileNavBackdrop: "z-40",
  mobileSidebar: "z-50",
  dialog: "z-[60]",
  floating: "z-[70]",
  tooltip: "z-[80]",
} as const;

/**
 * The numeric equivalent of `Z.floating`, for the one overlay that sets
 * `zIndex` inline. Keep the two in step.
 */
export const FLOATING_LAYER = 70;

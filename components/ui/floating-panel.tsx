"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FLOATING_LAYER } from "@/components/ui/z-layers";
import { cn } from "@/lib/utils";

/**
 * The application's floating layer.
 *
 * Every dropdown, picker and popover that is not a native `<select>` renders
 * through this. It exists because the alternative does not work: a panel
 * positioned `absolute` inside its own trigger is a child of whatever the
 * trigger sits in, and `components/ui/card.tsx` sets `overflow-hidden` on every
 * Card in the ERP. A combobox near the bottom of a card therefore had its list
 * sliced off at the card's edge — which is precisely what the registration
 * wizard's Region, Ward, Loan Type and Types-of-customer boxes were doing.
 *
 * The fix is architectural rather than cosmetic. Raising a z-index cannot help:
 * `overflow: hidden` clips a descendant no matter what it is stacked above, and
 * the clipping ancestor is a Card, a Dialog body, a tab panel or a scroll
 * container depending on the screen. The only thing that escapes all of them is
 * not being a descendant at all, so the panel is portalled to `document.body`
 * and positioned in viewport coordinates.
 *
 * What that buys, and what it costs:
 *
 *   - Nothing can clip it. Not cards, not dialogs, not tabs, not scrollers.
 *   - It is no longer carried along by its anchor, so the position has to be
 *     recomputed. `scroll` is listened for in the CAPTURE phase, which is the
 *     part that matters: scroll events from an inner container do not bubble,
 *     so a bubble-phase listener would keep the panel pinned to the viewport
 *     while the input slid away underneath it.
 *   - It flips above the anchor when there is not room below, and its height is
 *     clamped to the space actually available — a list is never taller than the
 *     window it has to fit in.
 *
 * The z-index comes from `components/ui/z-layers.ts`, which is where the whole
 * stacking order is stated — this panel is one member of the floating layer,
 * not a law unto itself.
 */


/** A snapshot that never changes; see `onClient` below. */
const subscribeNever = () => () => {};
/** Never render closer than this to the edge of the window. */
const VIEWPORT_MARGIN = 8;
/** Below this a flipped panel is worse than a short one; the list scrolls instead. */
const MIN_HEIGHT = 120;

interface Position {
  top: number;
  left: number;
  width: number | undefined;
  maxHeight: number;
  placement: "top" | "bottom";
}

export function FloatingPanel({
  anchorRef,
  open,
  onDismiss,
  matchWidth = true,
  align = "start",
  offset = 4,
  className,
  style,
  children,
  ...rest
}: {
  /** The element the panel is attached to. */
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  /** Called on a pointer down outside both the anchor and the panel. */
  onDismiss?: () => void;
  /** Take the anchor's width — right for a select, wrong for a wide menu. */
  matchWidth?: boolean;
  align?: "start" | "end";
  offset?: number;
  className?: string;
  /** Merged UNDER the positioning; a caller can theme the panel, not move it. */
  style?: React.CSSProperties;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "style">) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<Position | null>(null);

  /*
   * Measured in a layout effect and held in state, never computed during
   * render: reading getBoundingClientRect() in render scope is both impure and
   * a forced reflow, and the React Compiler is right to reject it.
   */
  const measure = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - offset - VIEWPORT_MARGIN;
    const above = rect.top - offset - VIEWPORT_MARGIN;

    /* Prefer below. Flip only when above is genuinely roomier and below is too
       cramped to be usable — flipping for a few pixels reads as a glitch. */
    const flip = below < MIN_HEIGHT && above > below;
    const maxHeight = Math.max(MIN_HEIGHT, flip ? above : below);

    const width = matchWidth ? rect.width : (panelRef.current?.offsetWidth ?? 0);
    const rawLeft = align === "end" ? rect.right - width : rect.left;

    setPosition({
      top: flip ? Math.max(VIEWPORT_MARGIN, rect.top - offset - Math.min(maxHeight, panelRef.current?.offsetHeight ?? maxHeight)) : rect.bottom + offset,
      /* Kept inside the window horizontally too — a box near the right edge
         would otherwise open partly off-screen. */
      left: Math.min(
        Math.max(VIEWPORT_MARGIN, rawLeft),
        Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
      ),
      width: matchWidth ? rect.width : undefined,
      maxHeight,
      placement: flip ? "top" : "bottom",
    });
  }, [anchorRef, align, matchWidth, offset]);

  /* Cleared as the box closes rather than in an effect: a stale position would
     paint for one frame at the old anchor when it reopens. Adjusting derived
     state during render is the sanctioned way to do this. */
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open && position !== null) setPosition(null);
  }

  React.useLayoutEffect(() => {
    if (!open) return;

    measure();

    /*
     * Capture phase, so scrolling ANY ancestor repositions the panel — a
     * dialog body, a tab panel, the page. Passive because none of this
     * cancels the scroll.
     */
    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    /* The anchor can move without anything scrolling — a field appearing above
       it, a validation message expanding a row. */
    const observer = new ResizeObserver(() => measure());
    if (anchorRef.current) observer.observe(anchorRef.current);
    if (panelRef.current) observer.observe(panelRef.current);
    observer.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
    };
  }, [open, measure, anchorRef]);

  /*
   * Dismissal lives here because only this component knows where the panel
   * ended up. A caller checking `trigger.contains(target)` would close the
   * panel the moment somebody clicked an option inside it — the panel is no
   * longer a descendant of the trigger.
   */
  React.useEffect(() => {
    if (!open || !onDismiss) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (anchorRef.current?.contains(target)) return;

      if (panelRef.current?.contains(target)) {
        /*
         * Inside the panel — but WHERE inside it matters.
         *
         * A tall panel covers page content, and its own background then sits
         * on top of whatever is beneath. Treating every click inside the box
         * as an interaction left the panel stuck open and swallowed the click:
         * the user pressed a button they could plainly see, the panel took the
         * event because it was on top, nothing happened, and the panel stayed.
         * Two clicks to press one button, with no feedback for the first.
         *
         * So only a click on something actually interactive counts. Anywhere
         * else in the panel is dead space, and dead space should get out of
         * the way.
         */
        const el = target instanceof Element ? target : target.parentElement;
        const interactive = el?.closest(
          '[role="option"], [role="menuitem"], button, a, input, textarea, select, label, [data-panel-interactive]'
        );

        if (interactive && panelRef.current.contains(interactive)) return;
      }

      onDismiss();
    };

    /*
     * Escape closes from anywhere, including when focus is inside the panel.
     * Callers that own a text input handle Escape themselves for their own
     * reasons (clearing a query first); this is the floor, not a replacement.
     */
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };

    /*
     * Focus leaving the panel and its anchor closes it too.
     *
     * Panels that open on focus — the top bar's customer search does — would
     * otherwise stay open over the page after a keyboard user tabbed straight
     * past, covering content they could no longer dismiss without reaching for
     * the mouse.
     */
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (target === null) return;
      if (anchorRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      onDismiss();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [open, onDismiss, anchorRef]);

  /*
   * Portals need a document; on the server there is none, and rendering the
   * panel into the tree there would put it straight back inside the clipping
   * parent this component exists to escape. The store never emits — the answer
   * to "am I on the client" cannot change — so this is just a lint-clean,
   * hydration-safe way to ask it.
   */
  const onClient = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );

  if (!open || !onClient) return null;

  return createPortal(
    <div
      ref={panelRef}
      data-floating-panel=""
      data-placement={position?.placement}
      /*
       * The caller's style first, so its colours and borders apply — and the
       * positioning after, so it cannot be overridden. Spreading the caller's
       * props last is what broke this: a panel passing `style` for its
       * background silently replaced `position: fixed` and every coordinate
       * with it, and landed at the bottom-left of the document.
       */
      style={{
        ...style,
        position: "fixed",
        zIndex: FLOATING_LAYER,
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: position?.width,
        maxHeight: position?.maxHeight,
        /* Hidden until measured, so it never paints once at 0,0 and jumps. */
        visibility: position ? "visible" : "hidden",
      }}
      className={cn("overflow-y-auto overscroll-contain", className)}
      {...rest}
    >
      {children}
    </div>,
    document.body
  );
}

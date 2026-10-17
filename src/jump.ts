// Moves an unread thread's timeline to the start of the latest reply.
//
// bb marks unread content with a "New" divider and scrolls to it once. It
// measures before long replies and UI cards finish layout, so a divider that
// looks like it sits on the last screen pins the view to the bottom, and the
// view then follows the growing content to the end. This waits for the
// divider, takes the view off the bottom pin, and holds the reply start at the
// top of the viewport while the layout settles. Any scroll, touch, click or
// key from the user stops it.
import { replyStartIndex } from "./reply";

const SCROLLER_SELECTOR = "[data-page-scroll-viewport]";
const ROW_SELECTOR = "[data-timeline-row-id]";
const DIVIDER_SELECTOR = '[data-testid="thread-unread-divider"]';

// How long to wait for bb to render the divider after the route changes.
const DIVIDER_WAIT_MS = 4_000;
const POLL_MS = 100;
// How long to hold the position while rows measure and cards render.
const HOLD_MS = 3_000;
// Space left above the reply so its first line is not flush with the edge.
const TOP_GAP_PX = 12;

function topLevelRows(scroller: Element, threadId: string): HTMLElement[] {
  const rows = Array.from(
    scroller.querySelectorAll<HTMLElement>(ROW_SELECTOR),
  ).filter(
    (row) =>
      row.dataset.timelineRowId?.startsWith(`${threadId}:`) &&
      !row.parentElement?.closest(ROW_SELECTOR),
  );
  return rows.sort(
    (a, b) => Number(a.dataset.index ?? 0) - Number(b.dataset.index ?? 0),
  );
}

function findScroller(threadId: string): HTMLElement | null {
  for (const scroller of document.querySelectorAll<HTMLElement>(
    SCROLLER_SELECTOR,
  )) {
    if (topLevelRows(scroller, threadId).length > 0) return scroller;
  }
  return null;
}

/** The later of the divider and the latest reply start, in document order. */
function findTarget(scroller: HTMLElement, threadId: string): HTMLElement | null {
  const rows = topLevelRows(scroller, threadId);
  const index = replyStartIndex(
    threadId,
    rows.map((row) => ({ id: row.dataset.timelineRowId ?? "" })),
  );
  const reply = index === -1 ? null : rows[index];
  const divider = scroller.querySelector<HTMLElement>(DIVIDER_SELECTOR);
  if (!reply) return divider;
  if (!divider) return reply;
  const dividerIsLater =
    reply.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING;
  return dividerIsLater ? divider : reply;
}

/**
 * bb treats a scroll as the user's only inside a short window after a wheel
 * event. Opening that window first makes bb drop its bottom pin and remember
 * the new position instead of snapping back.
 */
function releaseBottomPin(scroller: HTMLElement): void {
  scroller.dispatchEvent(
    new WheelEvent("wheel", { deltaY: -1, bubbles: true, cancelable: false }),
  );
}

function align(scroller: HTMLElement, target: HTMLElement): void {
  const offset =
    target.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top -
    TOP_GAP_PX;
  if (Math.abs(offset) < 1) return;
  releaseBottomPin(scroller);
  scroller.scrollTop += offset;
}

/** Starts watching for an unread open of `threadId`; returns a cleanup. */
export function jumpToReplyOnUnreadOpen(threadId: string): () => void {
  let stopped = false;
  let pollTimer: number | null = null;
  let frame: number | null = null;
  let detachInput: (() => void) | null = null;

  const stop = () => {
    stopped = true;
    if (pollTimer !== null) window.clearInterval(pollTimer);
    if (frame !== null) window.cancelAnimationFrame(frame);
    detachInput?.();
    pollTimer = frame = null;
    detachInput = null;
  };

  const hold = (scroller: HTMLElement) => {
    const onUser = (event: Event) => {
      if (event.isTrusted) stop();
    };
    const userEvents = ["wheel", "touchstart", "pointerdown", "keydown"];
    for (const type of userEvents) {
      scroller.addEventListener(type, onUser, { passive: true, capture: true });
    }
    window.addEventListener("keydown", onUser, { capture: true });
    detachInput = () => {
      for (const type of userEvents) {
        scroller.removeEventListener(type, onUser, { capture: true });
      }
      window.removeEventListener("keydown", onUser, { capture: true });
    };

    const until = performance.now() + HOLD_MS;
    let reachedBottomOnce = false;
    const tick = () => {
      frame = null;
      if (stopped || !scroller.isConnected || performance.now() > until) {
        stop();
        return;
      }
      const target = findTarget(scroller, threadId);
      const rows = topLevelRows(scroller, threadId);
      const lastRendered = rows.at(-1);
      const targetIsReply = target && target.matches(ROW_SELECTOR);
      // The latest reply can sit outside bb's rendered window. Scroll to the
      // end once so bb mounts the last rows, then look again.
      if (!targetIsReply && !reachedBottomOnce && lastRendered) {
        reachedBottomOnce = true;
        releaseBottomPin(scroller);
        scroller.scrollTop = scroller.scrollHeight;
      } else if (target) {
        align(scroller, target);
      }
      frame = window.requestAnimationFrame(tick);
    };
    // Let bb's own divider scroll run first, then take over.
    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(tick);
    });
  };

  const startedAt = performance.now();
  pollTimer = window.setInterval(() => {
    if (stopped) return;
    if (performance.now() - startedAt > DIVIDER_WAIT_MS) {
      stop();
      return;
    }
    const scroller = findScroller(threadId);
    if (!scroller?.querySelector(DIVIDER_SELECTOR)) return;
    if (pollTimer !== null) window.clearInterval(pollTimer);
    pollTimer = null;
    hold(scroller);
  }, POLL_MS);

  return stop;
}

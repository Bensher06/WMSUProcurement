import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

const VIEW_MARGIN = 12;
const MAX_PANEL_W = 920;

/**
 * Clamps max width to the viewport and nudges the panel horizontally so it stays within margins.
 * Use with `position: absolute` popovers that are anchored with `left-0` relative to a trigger.
 */
export function usePopoverStayInViewport(open: boolean, panelRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (!open) return;

    const align = () => {
      const panel = panelRef.current;
      if (!panel) return;
      panel.style.transform = '';
      const vw = window.innerWidth;
      const maxW = Math.min(MAX_PANEL_W, vw - 2 * VIEW_MARGIN);
      panel.style.maxWidth = `${maxW}px`;

      const r = panel.getBoundingClientRect();
      const low = VIEW_MARGIN - r.left;
      const high = vw - VIEW_MARGIN - r.right;
      const dx = Math.min(high, Math.max(low, 0));
      panel.style.transform = dx !== 0 ? `translateX(${dx}px)` : '';
    };

    align();
    window.addEventListener('resize', align);
    window.addEventListener('scroll', align, true);
    return () => {
      window.removeEventListener('resize', align);
      window.removeEventListener('scroll', align, true);
      const panel = panelRef.current;
      if (panel) {
        panel.style.transform = '';
        panel.style.maxWidth = '';
      }
    };
  }, [open, panelRef]);
}

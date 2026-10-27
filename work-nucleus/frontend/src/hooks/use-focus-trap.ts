import { useEffect, useRef } from "react";

interface UseFocusTrapOptions {
  isOpen: boolean;
  onClose?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  lockScroll?: boolean;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]",
].join(", ");

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  initialFocusRef,
  lockScroll = true,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore upon close
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.body.style.overflow = "hidden";
    }

    // Focus target element (initialFocusRef or first focusable element)
    const container = containerRef.current;
    const focusTarget = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      if (container) {
        const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          container.focus();
        }
      }
    };

    // Use requestAnimationFrame so DOM has mounted
    const frameId = requestAnimationFrame(focusTarget);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      if (!container) return;
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null); // only visible elements

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement || document.activeElement === container) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleKeyDown);
      if (lockScroll) {
        document.body.style.overflow = originalOverflow;
      }
      // Restore focus to previous element
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === "function") {
        previouslyFocusedElementRef.current.focus();
      }
    };
  }, [isOpen, onClose, initialFocusRef, lockScroll]);

  return containerRef;
}

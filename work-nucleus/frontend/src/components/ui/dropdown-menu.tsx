"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// v2 dropdown menu — see design-system-v2/preview/components.html (Dropdown Menu).
// Headless implementation (no extra dependency): React context for open state
// + ref-based click-outside + Escape close. Mirror Radix's API surface so a
// future swap to @radix-ui/react-dropdown-menu would be a one-line change.

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(
  null
);

function useDropdownMenu() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error("DropdownMenu subcomponent used outside <DropdownMenu>");
  }
  return ctx;
}

interface DropdownMenuProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function DropdownMenu({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, setOpen]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, contentRef, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ asChild, onClick, children, ...props }, ref) => {
  const ctx = useDropdownMenu();
  const composedRef = (node: HTMLButtonElement | null) => {
    ctx.triggerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  };

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented) ctx.setOpen(!ctx.open);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      ref?: React.Ref<HTMLButtonElement>;
      onClick?: React.MouseEventHandler<HTMLButtonElement>;
    }>;
    return React.cloneElement(child, {
      ref: composedRef,
      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) ctx.setOpen(!ctx.open);
      },
    });
  }

  return (
    <button
      type="button"
      ref={composedRef}
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

type Align = "start" | "end" | "center";

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: Align;
}

const alignClass: Record<Align, string> = {
  start: "left-0",
  end: "right-0",
  center: "left-1/2 -translate-x-1/2",
};

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ className, align = "end", children, ...props }, ref) => {
  const ctx = useDropdownMenu();
  const composedRef = (node: HTMLDivElement | null) => {
    ctx.contentRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };
  if (!ctx.open) return null;
  return (
    <div
      ref={composedRef}
      role="menu"
      className={cn(
        "absolute top-full z-[var(--z-dropdown,100)] mt-2 min-w-[200px] overflow-hidden rounded-xl border border-slate-200/60 bg-white p-1.5 shadow-[var(--shadow-dropdown)]",
        alignClass[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "danger";
  inset?: boolean;
  closeOnSelect?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  (
    { className, variant = "default", inset, closeOnSelect = true, onClick, children, ...props },
    ref
  ) => {
    const ctx = useDropdownMenu();
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      onClick?.(event);
      if (closeOnSelect && !event.defaultPrevented) ctx.setOpen(false);
    };
    return (
      <button
        type="button"
        ref={ref}
        role="menuitem"
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-slate-600 transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "hover:bg-slate-50 hover:text-slate-900 focus-visible:bg-slate-50",
          variant === "danger" && "text-red-600 hover:bg-red-50 focus-visible:bg-red-50",
          inset && "pl-8",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn("-mx-1.5 my-1 h-px bg-slate-100", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};

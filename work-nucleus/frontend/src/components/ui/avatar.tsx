"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// v2 avatar — see design-system-v2/CLAUDE.md §4 (Avatar).
// Sizes mirror tokens.css `--avatar-{xs,sm,md,lg,xl}`.
const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    />
  )
);
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} className={cn("aspect-square h-full w-full object-cover", className)} alt="" {...props} />
  )
);
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 font-bold text-white",
        className
      )}
      {...props}
    />
  )
);
AvatarFallback.displayName = "AvatarFallback";

// AvatarStack — overlap avatars for an interview-panel row. Children should
// be <Avatar> elements; the stack adds `border-2 border-white` and negative
// margin so they tile per design-system-v2/CLAUDE.md §4.
const AvatarStack = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex -space-x-2 [&>*]:ring-2 [&>*]:ring-white", className)}
    {...props}
  >
    {children}
  </div>
));
AvatarStack.displayName = "AvatarStack";

export { Avatar, AvatarImage, AvatarFallback, AvatarStack, avatarVariants };

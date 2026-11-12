"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuestEdgeLogoProps {
  variant?: "full" | "icon";
  theme?: "light" | "dark"; // "dark" means rendered on dark background (uses white text)
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  href?: string;
  priority?: boolean;
}

const sizeConfig = {
  full: {
    sm: { height: 26, width: 104 },
    md: { height: 34, width: 136 },
    lg: { height: 42, width: 168 },
    xl: { height: 52, width: 208 },
  },
  icon: {
    sm: { height: 28, width: 28 },
    md: { height: 34, width: 34 },
    lg: { height: 42, width: 42 },
    xl: { height: 50, width: 50 },
  },
};

export function QuestEdgeLogo({
  variant = "full",
  theme = "light",
  size = "md",
  className,
  href,
  priority = false,
}: QuestEdgeLogoProps) {
  const isFull = variant === "full";
  const { height, width } = sizeConfig[variant][size];

  const src = isFull
    ? theme === "dark"
      ? "/logo-white.png"
      : "/logo.png"
    : "/logo-icon.png";

  const content = (
    <div className={cn("inline-flex items-center shrink-0 select-none", className)}>
      <Image
        src={src}
        alt="QuestEdge"
        width={width}
        height={height}
        priority={priority}
        className="h-auto w-auto object-contain"
        style={{ maxHeight: height }}
      />
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus-visible:outline-emerald-600 group">
        {content}
      </Link>
    );
  }

  return content;
}

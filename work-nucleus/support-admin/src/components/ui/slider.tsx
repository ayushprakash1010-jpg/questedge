"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onValueChange?: (value: number) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, onValueChange, ...props }, ref) => {
    return (
      <input
        type="range"
        ref={ref}
        className={cn(
          "w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-indigo-600",
          className
        )}
        onChange={(e) => onValueChange?.(Number(e.target.value))}
        {...props}
      />
    );
  }
);
Slider.displayName = "Slider";

export { Slider };

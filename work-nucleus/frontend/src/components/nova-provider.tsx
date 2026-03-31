"use client";

import { useEffect } from "react";

let initialized = false;

export function NovaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized) return;
    initialized = true;

    import("@nova-design-system/nova-react").then((mod) => {
      if (mod.defineCustomElements) {
        mod.defineCustomElements();
      }
    });
  }, []);

  return <>{children}</>;
}

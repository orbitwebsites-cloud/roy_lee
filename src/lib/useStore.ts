"use client";

import { useEffect, useState } from "react";

// Re-renders a component whenever the local store changes. Keeps the UI in
// sync with localStorage writes (which dispatch a `halo:update` event).
export function useStoreValue<T>(getter: () => T): T {
  const [value, setValue] = useState<T>(getter);
  useEffect(() => {
    const update = () => setValue(getter());
    update();
    window.addEventListener("halo:update", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("halo:update", update);
      window.removeEventListener("storage", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

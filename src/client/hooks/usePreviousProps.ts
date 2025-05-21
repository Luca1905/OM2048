import { useEffect, useRef } from "react";

export default function usePreviousProps<K>(value: K): K | undefined {
  const ref = useRef<K | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

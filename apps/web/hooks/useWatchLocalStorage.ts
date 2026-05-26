import { useState, useEffect, useRef } from "react";

type Props<TValue> = {
  key: string;
  initialValue?: TValue;
  deserializer?: (value: string) => TValue;
  serializer?: (value: TValue | undefined) => string;
};

export function useWatchLocalStorage<TValue = string>({
  key,
  initialValue,
  deserializer = (v) => v as TValue,
  serializer = (v) => (v as unknown as string).toString(),
}: Props<TValue>) {
  const deserializerRef = useRef(deserializer);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    deserializerRef.current = deserializer;
  }, [deserializer]);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  const [value, setValue] = useState<TValue | undefined>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializerRef.current(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setAndStoreValue = (v: TValue | undefined) => {
    try {
      window.localStorage.setItem(key, serializer(v));
    } catch (error) {
      console.error(error);
    }
    setValue(v);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }
      if (event.newValue === null) {
        setValue(initialValueRef.current);
        return;
      }
      setValue(deserializerRef.current(event.newValue));
    };

    window.addEventListener("storage", handleStorage);

    const interval = setInterval(() => {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setValue(deserializerRef.current(item));
        return;
      }
      setValue(initialValueRef.current);
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [key]);

  return [value, setAndStoreValue] as const;
}

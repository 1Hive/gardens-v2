import { useState, useEffect } from "react";

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
  const [value, setValue] = useState<TValue | undefined>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
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
    const interval = setInterval(() => {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setValue(deserializer(item));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [key]);

  return [value, setAndStoreValue] as const;
}

import { useState, useEffect } from "react";

type Props<TValue> = {
  key: string;
  initialValue: TValue;
  deserializer?: (value: string) => TValue;
  serializer?: (value: TValue) => string;
};

export function useWatchLocalStorage<TValue = string>({
  key,
  initialValue,
  deserializer = (v) => v as TValue,
  serializer = (v) => (v as unknown as string).toString(),
}: Props<TValue>) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<TValue>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, serializer(storedValue));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue]);

  useEffect(() => {
    const interval = setInterval(() => {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(deserializer(item));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [key]);

  return [storedValue, setStoredValue];
}

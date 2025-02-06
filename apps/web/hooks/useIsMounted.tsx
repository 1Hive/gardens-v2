import { useEffect, useRef } from "react";

export const useIsMounted = function () {
  const mountedRef = useRef(false);
  useEffect(function useMountedEffect() {
    mountedRef.current = true;
    return function useMountedEffectCleanup() {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
};

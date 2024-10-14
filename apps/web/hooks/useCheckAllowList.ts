import { useEffect, useState } from "react";
import { Address, zeroAddress } from "viem";

export default function useCheckAllowList(
  allowList: Address[],
  address: Address | undefined,
) {
  const [isAllowed, setIsAllowed] = useState(false);
  console.log({ allowList });

  useEffect(() => {
    if (allowList.length === 0) {
      setIsAllowed(false);
    } else if (allowList[0] === zeroAddress) {
      setIsAllowed(true);
    } else {
      const addressLower = address?.toLowerCase();
      const isInAllowList = allowList.some(
        (addr) => addr.toLowerCase() === addressLower,
      );
      setIsAllowed(isInAllowList);
    }
  }, [allowList, address]);

  return isAllowed;
}

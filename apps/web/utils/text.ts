export function capitalize(str: string): string {
  if (!str.length) {
    return "";
  }
  console.log("capitalize", {
    str,
    capitalized: str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
  });
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export const ethAddressRegEx = /^0x[a-fA-F0-9]{40}$/;

export const prettyTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

export const truncateString = (str: string) => {
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
};

export const shortenAddress = (address: string, chars = 4): string => {
  if (!address) return "";
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
};

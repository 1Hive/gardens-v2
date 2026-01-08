const timeUnits = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 604800,
  months: 2628000,
  years: 31536000,
};

type TimeUnit = keyof typeof timeUnits;

export function parseTimeUnit(value: number, from: TimeUnit, to: TimeUnit) {
  return +((value * timeUnits[from]) / timeUnits[to]).toFixed(4);
}

export function formatNumber(num: number) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toString();
}

export function timeAgo(dateString: string | undefined): string {
  if (!dateString) return "Unknown";

  const past = new Date(dateString).getTime();
  const now = Date.now();
  const diff = now - past;

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

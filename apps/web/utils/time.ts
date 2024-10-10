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

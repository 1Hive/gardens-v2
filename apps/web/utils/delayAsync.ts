export default function delayAsync(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

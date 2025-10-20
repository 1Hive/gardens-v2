export function getLastPathSegment(url: string): string {
  const segments = url.replace(/\/+$/, "").split("/");
  return segments[segments.length - 1];
}

export function apiUrl(path: string) {
  const host =
    typeof window === "undefined" ? "localhost" : window.location.hostname;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `http://${host}:8000${normalized}`;
}

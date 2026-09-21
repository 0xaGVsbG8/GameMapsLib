export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (typeof window === "undefined") {
    const serverBase = process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";
    return `${serverBase}${normalized}`;
  }

  const explicit = process.env.NEXT_PUBLIC_API_BASE;
  if (explicit) {
    return `${explicit.replace(/\/$/, "")}${normalized}`;
  }

  // Direct Next dev server still talks to Django on 8000.
  // Behind nginx (port 80/8080/443) the browser uses the same origin.
  if (window.location.port === "3000") {
    return `http://${window.location.hostname}:8000${normalized}`;
  }

  return normalized;
}

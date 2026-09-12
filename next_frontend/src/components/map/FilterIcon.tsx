const iconClass = "h-4 w-4 shrink-0";

export function FilterIcon({ name }: { name: string }) {
  switch (name) {
    case "travel":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M12 3c.4 2.4 2 4.4 4.4 5.6C14 9.8 12.4 11.8 12 14.2 11.6 11.8 10 9.8 7.6 8.6 10 7.4 11.6 5.4 12 3Z" />
          <path d="M12 10.5c.3 1.6 1.3 2.9 2.8 3.7-1.5.8-2.5 2.1-2.8 3.7-.3-1.6-1.3-2.9-2.8-3.7 1.5-.8 2.5-2.1 2.8-3.7Z" />
        </svg>
      );
    case "tower":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M12 2 8 6v3h8V6l-4-4Zm-5 8v10h3v-4h4v4h3V10H7Z" />
        </svg>
      );
    case "alpha":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "dungeon":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M4 10V21h6v-5h4v5h6V10L12 4 4 10Z" />
        </svg>
      );
    case "chest":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M3 8h18v3h-7v2h7v7H3v-7h7v-2H3V8Zm8 0V5h2v3h-2Z" />
        </svg>
      );
    case "element":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M12 2 4 12h5l-2 10 11-12h-6L12 2Z" />
        </svg>
      );
    case "fruit":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M12 4c2 0 3-2 3-2s.2 2.4 2 3.4C19 6.8 21 9.2 21 13c0 4.4-3.6 8-9 8s-9-3.6-9-8c0-3.8 2-6.2 4-7.6C8.8 4.4 9 2 9 2s1 2 3 2Z" />
        </svg>
      );
    case "note":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M6 3h9l5 5v13H6V3Zm8 1.5V9h4.5L14 4.5ZM8 12h8v1.5H8V12Zm0 3.5h8V17H8v-1.5Z" />
        </svg>
      );
    case "statue-alt":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <circle cx="12" cy="6" r="3" />
          <path d="M7 21v-2l3-3V11h4v5l3 3v2H7Z" />
        </svg>
      );
    case "grace":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M12 2 13.6 8H20l-5.2 3.8L16.5 18 12 14.4 7.5 18l1.7-6.2L4 8h6.4L12 2Z" />
        </svg>
      );
    case "boss":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M7 4h10l3 5-8 12L4 9l3-5Zm5 4.5L9.5 12h5L12 8.5Z" />
        </svg>
      );
    case "merchant":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M4 7h16l-1.5 11h-13L4 7Zm4-3h8l1 3H7l1-3Z" />
        </svg>
      );
    case "seed":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M12 3c4 3 6 7 6 10a6 6 0 1 1-12 0c0-3 2-7 6-10Z" />
        </svg>
      );
    case "tear":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M12 3c3.5 5 6 8.2 6 11.2A6 6 0 1 1 6 14.2C6 11.2 8.5 8 12 3Z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={iconClass} fill="currentColor" aria-hidden>
          <path d="M12 3 8 9h3v7h2V9h3L12 3Zm-6 16h12v2H6v-2Z" />
        </svg>
      );
  }
}

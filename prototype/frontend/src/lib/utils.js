import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn's class merge helper: conditional classes + Tailwind conflict resolution.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

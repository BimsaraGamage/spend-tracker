import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names, dropping falsy ones. When two classes set the same
 * property, such as `px-2` and `px-4`, the later one wins.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

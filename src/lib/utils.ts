import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | number | undefined | null, formatStr: string = 'dd MMM yyyy') {
  if (!date) return '';
  const d = new Date(date);
  if (!isValid(d)) return '';
  return format(d, formatStr);
}

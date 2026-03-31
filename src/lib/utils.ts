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

export function normalizeFileName(fileName: string): string {
  // Normalize to remove Vietnamese accents
  const normalized = fileName.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  
  // Replace any character that is not alphanumeric, dot, or hyphen with underscore
  return normalized.replace(/[^a-zA-Z0-9.-]/g, '_');
}

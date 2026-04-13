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

export function countBusinessDays(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  // Ensure start is before end
  const d1 = start < end ? start : end;
  const d2 = start < end ? end : start;
  
  let count = 0;
  const curDate = new Date(d1.getTime());
  while (curDate <= d2) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 is Sunday, 6 is Saturday
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
}

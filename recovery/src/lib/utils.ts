import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(usdAmount: number | string | null | undefined): string {
  // A genuinely absent cost (not extracted from the document, no market rate
  // available) must render as "Not stated" rather than a fabricated ₹0.
  if (usdAmount === null || usdAmount === undefined || usdAmount === '') return 'Not stated';
  const amount = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
  if (Number.isNaN(amount)) return 'Not stated';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount * 94.61);
}

export function extractCityFromLocation(location: string): string {
  if (!location) return '';
  let city = location;

  const separators = ['→', '->', '—', '-'];
  for (const sep of separators) {
    if (city.includes(sep)) {
      city = city.split(sep).pop()!;
      break;
    }
  }

  city = city.replace(/\([^)]*\)/g, '');

  if (city.includes(',')) {
    city = city.split(',')[0];
  }

  return city.trim();
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

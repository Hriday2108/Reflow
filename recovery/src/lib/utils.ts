import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(usdAmount: number | string): string {
  const amount = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount;
  const rate = 94.61;
  const inr = amount * rate;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(inr);
}

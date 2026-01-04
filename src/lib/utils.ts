import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";

// Classname merging utility from shadcn
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting with locale support
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Compact currency format for large numbers
export function formatCurrencyCompact(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount, currency, locale);
}

// Date formatting with various formats
export type DateFormatType = 
  | 'short'      // Jan 15
  | 'medium'     // Jan 15, 2024
  | 'long'       // January 15, 2024
  | 'time'       // 3:45 PM
  | 'datetime'   // Jan 15, 3:45 PM
  | 'full'       // January 15, 2024 at 3:45 PM
  | 'relative'   // 2 hours ago
  | 'iso';       // 2024-01-15

const dateFormats: Record<DateFormatType, string> = {
  short: 'MMM d',
  medium: 'MMM d, yyyy',
  long: 'MMMM d, yyyy',
  time: 'h:mm a',
  datetime: 'MMM d, h:mm a',
  full: "MMMM d, yyyy 'at' h:mm a",
  relative: '', // Handled separately
  iso: 'yyyy-MM-dd',
};

export function formatDate(
  date: Date | string | null | undefined,
  formatType: DateFormatType = 'medium'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  if (formatType === 'relative') {
    return formatDistanceToNow(dateObj, { addSuffix: true });
  }
  
  return format(dateObj, dateFormats[formatType]);
}

// Smart date formatting (Today, Yesterday, or date)
export function formatSmartDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  if (isToday(dateObj)) {
    return `Today, ${format(dateObj, 'h:mm a')}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Yesterday, ${format(dateObj, 'h:mm a')}`;
  }
  
  return format(dateObj, 'MMM d, h:mm a');
}

// Phone number formatting
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle different phone number lengths
  if (cleaned.length === 10) {
    // US format: (555) 123-4567
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned[0] === '1') {
    // US with country code: +1 (555) 123-4567
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  if (cleaned.length > 10) {
    // International format: +XX XXX XXX XXXX
    return `+${cleaned.slice(0, cleaned.length - 10)} ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
  }
  
  // Return original if format is unknown
  return phone;
}

// Text truncation with ellipsis
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length).trim() + ellipsis;
}

// Get initials from name
export function getInitials(name: string | null | undefined, maxChars: number = 2): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part[0].toUpperCase())
    .slice(0, maxChars)
    .join('');
}

// Slugify text for URLs
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Pluralize word based on count
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`);
}

// Format number with abbreviation (1K, 1M, etc.)
export function formatNumberCompact(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Generate random ID
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Throttle function
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Check if object is empty
export function isEmpty(obj: object | null | undefined): boolean {
  if (!obj) return true;
  return Object.keys(obj).length === 0;
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// Capitalize first letter
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Title case
export function titleCase(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone format
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// Get color from string (for consistent avatar colors)
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Clamp number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

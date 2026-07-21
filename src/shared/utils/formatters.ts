/**
 * Formats a number to Iranian Toman (with Persian digits).
 * Example: 150000 -> ۱۵۰,۰۰۰ تومان
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fa-IR', {
    style: 'currency',
    currency: 'IRR',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('ریال', 'تومان');
}

/**
 * Converts ISO date strings to localized Jalali calendar strings.
 * Example: 1403/05/01 12:30
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    calendar: 'persian',
  }).format(date);
}

/**
 * Converts English numbers to Persian digits.
 */
export function toPersianDigits(num: number | string): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return num
    .toString()
    .replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

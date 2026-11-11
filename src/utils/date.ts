export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts an ISO string, timestamp, or date string into local YYYY-MM-DD.
 * Avoids the UTC-boundary issue where UTC is one day behind Southeast Asia / local time.
 */
export function formatLocalDate(isoOrDateString?: string | null): string {
  if (!isoOrDateString) return '';
  // If already YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateString)) {
    return isoOrDateString;
  }
  const d = new Date(isoOrDateString);
  if (isNaN(d.getTime())) {
    return isoOrDateString.slice(0, 10);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function stepIsoDate(isoDate: string, days: number): string {
  if (!isoDate || isoDate === 'all') isoDate = getTodayIsoDate();
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate || isoDate === 'all') return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekday = days[dt.getDay()];
  const dd = String(d).padStart(2, '0');
  const mmm = months[m - 1];
  return `${weekday}, ${dd} ${mmm} ${y}`;
}

export function formatDateDisplay(isoDateOrString: string): string {
  try {
    const d = new Date(isoDateOrString);
    if (isNaN(d.getTime())) return isoDateOrString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDateOrString;
  }
}

export function formatDateTimeDisplay(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function isFutureDate(dateStr: string): boolean {
  const today = getTodayIsoDate();
  return dateStr > today;
}

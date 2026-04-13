/**
 * Shared utility functions for Patient Companion Pro
 */

/**
 * Safe date formatter — never returns "Invalid Date"
 * Handles null, undefined, postgres timestamps, ISO strings, and Date objects
 */
export const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date with time
 */
export const formatDateTime = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Escape HTML entities to prevent XSS in template strings
 * Used in prescription print templates where user data is injected into document.write()
 */
export const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Generate time slots between start and end times at a given interval (minutes)
 * start/end: "HH:MM" (24h)
 */
export const generateTimeSlots = (startTime, endTime, durationMins = 30) => {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  while (current + durationMins <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    slots.push(`${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`);
    current += durationMins;
  }
  return slots;
};

/**
 * Day of week names (0=Sunday)
 */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


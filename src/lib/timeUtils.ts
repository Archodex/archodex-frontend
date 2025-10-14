/**
 * Time utility functions for time picker components
 */

/**
 * Validates and formats a time string to HH:mm:ss format
 * Handles partial input during typing and validates ranges
 */
export function validateAndFormatTime(timeString: string): string {
  // Allow partial input during typing
  if (timeString === '') return '00:00:00';

  // Remove any non-digit or colon characters
  const cleaned = timeString.replace(/[^\d:]/g, '');

  // Split by colons and parse
  const parts = cleaned.split(':');

  // Pad and validate each part
  const hours = Math.min(23, Math.max(0, parseInt(parts[0] || '0', 10) || 0));
  const minutes = Math.min(59, Math.max(0, parseInt(parts[1] || '0', 10) || 0));
  const seconds = Math.min(59, Math.max(0, parseInt(parts[2] || '0', 10) || 0));

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parses a time string into individual components
 */
export function parseTime(timeString: string): { hours: number; minutes: number; seconds: number } {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return { hours: hours || 0, minutes: minutes || 0, seconds: seconds || 0 };
}

/**
 * Checks if a time string is valid HH:mm:ss format
 */
export function isValidTimeFormat(timeString: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * Creates a time string from hours, minutes, and seconds
 */
export function createTimeString(hours: number, minutes: number, seconds: number): string {
  const h = Math.min(23, Math.max(0, hours));
  const m = Math.min(59, Math.max(0, minutes));
  const s = Math.min(59, Math.max(0, seconds));

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

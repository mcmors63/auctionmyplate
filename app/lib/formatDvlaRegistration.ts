// app/lib/formatDvlaRegistration.ts

/**
 * DVLA-style formatting:
 * - Uppercase
 * - Remove all non A–Z / 0–9
 * - If length is 4–7 chars, insert a space before the last 3 chars.
 *
 * Examples:
 *  "E27 MOM"   -> "E27 MOM"
 *  "ab12cde"   -> "AB12 CDE"
 *  "abc123"    -> "ABC 123"
 *  "a1abc"     -> "A1 ABC"
 */
export function formatDvlaRegistration(input: string): string {
  if (!input) return "";

  // Uppercase + strip non-alphanumeric
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Very short, just return
  if (clean.length <= 3) return clean;

  // Space before last 3 chars for most real-world formats
  if (clean.length >= 4 && clean.length <= 7) {
    const prefix = clean.slice(0, clean.length - 3);
    const suffix = clean.slice(-3);
    return `${prefix} ${suffix}`.trim();
  }

  // Fallback: leave as-is (very long / odd marks)
  return clean;
}

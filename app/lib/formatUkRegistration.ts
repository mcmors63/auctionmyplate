// lib/formatUkRegistration.ts

// Normalises + formats a UK registration for display on a plate
// Handles:
// - Current style: AB12CDE  -> AB12 CDE
// - Prefix/suffix styles: ABC123D, A123BCD etc -> ABC 123D / A123 BCD
// - Dateless: fallback splits before last 3 characters if length > 4
export function formatUkRegistration(raw: string | null | undefined): string {
  if (!raw) return "";

  // Remove anything that isn't a letter or digit
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  if (!clean) return "";

  // Current style (since 2001): AB12CDE
  if (/^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`; // AB12 CDE
  }

  // Prefix / suffix style: A123BCD, AB123CD, ABC123D etc.
  // Letters + digits + letters
  const prefixMatch = clean.match(/^([A-Z]{1,3})([0-9]{1,3})([A-Z]{1,3})$/);
  if (prefixMatch) {
    const [, lettersStart, digits, lettersEnd] = prefixMatch;
    return `${lettersStart} ${digits}${lettersEnd}`; // ABC 123D / A123 BCD
  }

  // Anything else with more than 4 chars – split before last 3
  if (clean.length > 4) {
    const splitIndex = clean.length - 3;
    return `${clean.slice(0, splitIndex)} ${clean.slice(splitIndex)}`;
  }

  // Short plates, nothing clever to do
  return clean;
}

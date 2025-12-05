// app/lib/formatUkRegistration.ts

// Normalises + formats a UK registration for display on a plate.
// Handles:
// - Current style: AB12CDE      -> AB12 CDE
// - Prefix/suffix: CNL631V      -> CNL 631V
//                    E27MOM     -> E27 MOM
//                    A123BCD    -> A123 BCD
// - Dateless: generic fallback splits before last 3 chars if length > 4
export function formatUkRegistration(raw: string | null | undefined): string {
  if (!raw) return "";

  // Remove anything that isn't a letter or digit
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!clean) return "";

  // 1) Current style (since 2001): AB12CDE -> AB12 CDE
  if (/^[A-Z]{2}[0-9]{2}[A-Z]{3}$/.test(clean)) {
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  }

  // 2) Prefix style 1 letter + 2 digits + 3 letters: E27MOM -> E27 MOM
  if (/^[A-Z][0-9]{2}[A-Z]{3}$/.test(clean)) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }

  // 3) Other prefix/suffix styles: letters + digits + letters
  //    CNL631V -> CNL 631V, A123BCD -> A123 BCD, etc.
  const prefixMatch = clean.match(/^([A-Z]{1,3})([0-9]{1,3})([A-Z]{1,3})$/);
  if (prefixMatch) {
    const [, lettersStart, digits, lettersEnd] = prefixMatch;
    return `${lettersStart} ${digits}${lettersEnd}`;
  }

  // 4) Generic fallback: anything else longer than 4 → split before last 3
  if (clean.length > 4) {
    const splitIndex = clean.length - 3;
    return `${clean.slice(0, splitIndex)} ${clean.slice(splitIndex)}`;
  }

  // 5) Short plates – nothing clever to do
  return clean;
}

// Backwards compat for older imports
export function formatDvlaRegistration(input: string): string {
  return formatUkRegistration(input);
}

/**
 * STRING AND CODE NORMALIZER
 * 
 * Rules:
 * 1. Maintain string type without numeric conversion.
 * 2. Preserve leading zeros (e.g. "01" remains "01").
 * 3. Trim extra surrounding spaces.
 * 4. Collapse consecutive internal whitespaces into single space.
 * 5. Normalize casing for human display readability without mangling abbreviations (e.g. "DKI", "DI").
 */

export function normalizeCode(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  // Strip all whitespace inside code
  return str.replace(/\s+/g, '');
}

export function normalizeName(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  // Collapse duplicate spaces
  const collapsed = str.replace(/\s+/g, ' ');
  if (!collapsed) return '';

  // Preserve uppercase acronyms or standardize title case
  return collapsed;
}

export function toCleanTitleCase(text: string): string {
  if (!text) return '';
  const cleaned = normalizeName(text);
  
  // List of words that should remain uppercase or lowercase
  const UPPERCASE_TOKENS = new Set(['DKI', 'DI', 'I', 'II', 'III', 'IV', 'V']);
  
  return cleaned
    .split(' ')
    .map(word => {
      const upper = word.toUpperCase();
      if (UPPERCASE_TOKENS.has(upper)) return upper;
      if (word.length <= 1) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function detectRegencyType(name: string): 'KABUPATEN' | 'KOTA' {
  const upper = name.toUpperCase();
  if (upper.startsWith('KOTA ') || upper.startsWith('KOTAMADYA ')) {
    return 'KOTA';
  }
  return 'KABUPATEN';
}

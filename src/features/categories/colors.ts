/**
 * Category colour helpers. Colours are stored as `#RRGGBB` HEX strings.
 *
 * `CATEGORY_PRESETS` are the quick-pick swatches shown in the category form;
 * `buildSpectrum`/`buildGrays` generate the larger palette behind the
 * "custom colour" square.
 */

export const CATEGORY_PRESETS = [
  '#E0552E', // brand orange-red
  '#3DB8AD', // teal
  '#F2C44D', // yellow
  '#A06CF0', // purple
  '#3E7BE8', // blue
  '#2BB24C', // green
  '#F2862E', // orange
  '#EC4E9C', // pink
  '#1B2230', // navy
  '#CE2A3A', // red
] as const;

export const DEFAULT_CATEGORY_COLOR = CATEGORY_PRESETS[0];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Returns the normalized `#RRGGBB` (uppercased, `#` added) or null if invalid. */
export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_RE.test(withHash) ? withHash.toUpperCase() : null;
}

export function isValidHex(value: string): boolean {
  return normalizeHex(value) !== null;
}

/** HSL (h: 0-360, s/l: 0-100) → `#RRGGBB`. */
function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lum = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lum, 1 - lum);
  const f = (n: number) => {
    const color = lum - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** A grid of hue (columns) × lightness (rows) swatches for the custom palette. */
export function buildSpectrum(): string[][] {
  const hues = Array.from({ length: 12 }, (_, i) => i * 30);
  const lightnesses = [86, 72, 58, 46, 34, 24];
  return lightnesses.map((l) => hues.map((h) => hslToHex(h, 78, l)));
}

/** A neutral grayscale row for the custom palette. */
export function buildGrays(): string[] {
  return [100, 88, 72, 56, 40, 24, 12, 0].map((l) => hslToHex(0, 0, l));
}

/**
 * Parse review count from Google Maps text (EN + ES).
 */
export function parseReviewCount(text: string | null | undefined): number | null {
  if (!text?.trim()) return null;

  const normalized = text.replace(/\u00a0/g, " ").trim();

  const patterns = [
    /(\d[\d,.]*)\s*(?:reviews?|reseñas?|resenas?|opiniones?|calificaciones?)/i,
    /(?:reviews?|reseñas?|resenas?|opiniones?|calificaciones?)[:\s]*(\d[\d,.]*)/i,
    /\((\d[\d,.]*)\)/,
    /(\d[\d,.]+)\s*(?:reseña|opinion)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const value = parseInt(match[1].replace(/[,.]/g, ""), 10);
      if (!Number.isNaN(value)) return value;
    }
  }

  return null;
}

/** Remove Google Maps icon font glyphs from contact fields. */
export function cleanContactText(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;

  const cleaned = text
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/[\u200E\u200F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

export function cleanPhone(text: string | null | undefined): string | null {
  const cleaned = cleanContactText(text);
  if (!cleaned) return null;

  const digits = cleaned.replace(/[^\d+]/g, "");
  if (digits.length >= 10) return digits;

  return cleaned;
}

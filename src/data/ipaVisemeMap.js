/**
 * IPA phone → Rhubarb viseme class mapping
 *
 * Only phones with a direct Arpabet equivalent in Rhubarb's Preston Blair set
 * are mapped. Phones without a Rhubarb Arpabet basis return null → shown as
 * "tidak ada di Rhubarb" in VAS.
 *
 * Reference: https://github.com/DanielSWolf/rhubarb-lip-sync#mouth-shapes
 */

// representativeIPA: IPA equivalent of Rhubarb's Arpabet for that viseme class.
// Used for display only — derived from Rhubarb docs, not runtime output.
export const RHUBARB_VISEMES = {
  A: { id: "A", name: "MBP",  morphTarget: "viseme_PP",  description: "Closed mouth (M, B, P)",                        representativeIPA: "m / b / p" },
  B: { id: "B", name: "ETC",  morphTarget: "viseme_kk",  description: "Slightly open, clenched teeth (most consonants)", representativeIPA: "t / d / s / z / n / ŋ / k / ɡ / θ / ð / ʃ / ʒ / tʃ / dʒ / h / j / r" },
  C: { id: "C", name: "E",    morphTarget: "viseme_E",   description: "Open mouth (EH, AE)",                            representativeIPA: "ɛ / æ" },
  D: { id: "D", name: "AI",   morphTarget: "viseme_aa",  description: "Wide open mouth (AA, AH, AY)",                   representativeIPA: "ɑ / a / ʌ / aɪ" },
  E: { id: "E", name: "O",    morphTarget: "viseme_O",   description: "Slightly rounded (AO, AX, ER)",                  representativeIPA: "ɔ / ə / ɜ" },
  F: { id: "F", name: "U",    morphTarget: "viseme_U",   description: "Puckered lips (UW, OW, W)",                      representativeIPA: "u / oʊ / w" },
  G: { id: "G", name: "FV",   morphTarget: "viseme_FF",  description: "Upper teeth on lower lip (F, V)",                representativeIPA: "f / v" },
  H: { id: "H", name: "L",    morphTarget: "viseme_nn",  description: "Tongue behind upper teeth (L)",                  representativeIPA: "l" },
  X: { id: "X", name: "REST", morphTarget: "viseme_sil", description: "Neutral/rest position",                          representativeIPA: "-" },
};

/**
 * IPA phone → Rhubarb viseme class.
 * Only includes phones that have a direct Arpabet basis in Rhubarb docs.
 * Phones NOT listed here (e.g. /i/, /e/, /o/) have no Rhubarb Arpabet entry
 * and will return null → "tidak ada di Rhubarb" in VAS.
 */
export const IPA_TO_VISEME = {
  // ── A: M, B, P ──
  "m": "A",
  "b": "A",
  "p": "A",

  // ── G: F, V ──
  "f": "G",
  "v": "G",

  // ── H: L ──
  "l": "H",

  // ── B: N, NG, K, G, T, D, S, Z, TH, DH, SH, ZH, CH, JH, HH, Y, R ──
  "n": "B",
  "ŋ": "B",
  "k": "B",
  "ɡ": "B",
  "g": "B",   // ASCII fallback
  "t": "B",
  "d": "B",
  "s": "B",
  "z": "B",
  "θ": "B",   // TH voiceless
  "ð": "B",   // DH voiced
  "ʃ": "B",   // SH
  "ʒ": "B",   // ZH
  "tʃ": "B",  // CH
  "dʒ": "B",  // JH
  "h": "B",   // HH
  "j": "B",   // Y
  "r": "B",   // R
  "ɾ": "B",   // alveolar flap (Indonesian r, espeak variant)

  // ── C: EH (ɛ), AE (æ) ──
  "ɛ": "C",
  "ɛː": "C",
  "æ": "C",

  // ── D: AA (ɑ), AH (a/ʌ), AY (aɪ) ──
  "ɑ": "D",
  "ɑː": "D",
  "a": "D",
  "aː": "D",
  "ʌ": "D",
  "aɪ": "D",

  // ── E: AO (ɔ), AX (ə), ER (ɜ) ──
  "ɔ": "E",
  "ɔː": "E",
  "ə": "E",
  "ɘ": "E",   // Indonesian pepet, espeak variant of schwa
  "ɜ": "E",
  "ɜː": "E",

  // ── F: UW (u), OW (oʊ), W ──
  "u": "F",
  "uː": "F",
  "ʊ": "F",
  "oʊ": "F",
  "w": "F",

  // ── No Arpabet basis in Rhubarb → NOT mapped (return null) ──
  // /i/, /iː/, /ɪ/ → no IY in Rhubarb's set
  // /e/, /eː/, /eɪ/ → no EY as separate viseme
  // /o/, /oː/ → no OW as separate viseme (Indonesian /o/ ≠ English OW)
  // /ɦ/, /ʔ/ → no direct Arpabet entry
};

/**
 * Convert an IPA phone to a Rhubarb viseme class.
 * Returns null if no Arpabet basis exists in Rhubarb.
 */
export function ipaToViseme(phone) {
  if (!phone) return null;
  const norm = phone.replace(/[ˈˌ]/g, "").trim();
  return IPA_TO_VISEME[norm] ?? null;
}

/**
 * Convert phonemizer output to flat array for VAS comparison.
 */
export function phonemizerToExpected(wordsPhones) {
  const result = [];
  for (const { word, phones } of wordsPhones) {
    if (!phones || phones.length === 0) {
      result.push({ word, phone: "?", expectedViseme: null, notInDictionary: true });
      continue;
    }
    for (const phone of phones) {
      const viseme = ipaToViseme(phone);
      result.push({
        word,
        phone,
        expectedViseme: viseme,
      });
    }
  }
  return result;
}

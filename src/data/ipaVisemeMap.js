/**
 * IPA phone → Rhubarb viseme class mapping
 *
 * Phones come from phonemizer (espeak-ng backend), with_stress=False.
 * Rhubarb viseme classes A–X follow Preston Blair phoneme set.
 * Reference: https://github.com/DanielSWolf/rhubarb-lip-sync#mouth-shapes
 */

// Rhubarb viseme definitions (same as VISEME_MAP in useLipsyncStore)
export const RHUBARB_VISEMES = {
  A: { id: "A", name: "MBP",  morphTarget: "viseme_PP",  description: "Closed mouth (M, B, P)" },
  B: { id: "B", name: "ETC",  morphTarget: "viseme_kk",  description: "Slightly open, clenched teeth (most consonants)" },
  C: { id: "C", name: "E",    morphTarget: "viseme_E",   description: "Open mouth (EH, AE)" },
  D: { id: "D", name: "AI",   morphTarget: "viseme_aa",  description: "Wide open mouth (AA, AH, AY)" },
  E: { id: "E", name: "O",    morphTarget: "viseme_O",   description: "Slightly rounded (AO, ER)" },
  F: { id: "F", name: "U",    morphTarget: "viseme_U",   description: "Puckered lips (UW, OW, W)" },
  G: { id: "G", name: "FV",   morphTarget: "viseme_FF",  description: "Upper teeth on lower lip (F, V)" },
  H: { id: "H", name: "L",    morphTarget: "viseme_nn",  description: "Tongue behind upper teeth (L)" },
  X: { id: "X", name: "REST", morphTarget: "viseme_sil", description: "Neutral/rest position" },
};

/**
 * IPA phone → Rhubarb viseme class
 *
 * Covers common espeak-ng IPA output for Indonesian (id) and English (en-us).
 * Phones without a mapping return null (treated as unknown/skip in VAS).
 *
 * Sources:
 *   - espeak-ng IPA output for id/en-us (with_stress=False)
 *   - Preston Blair viseme chart used by Rhubarb
 */
export const IPA_TO_VISEME = {
  // ── Bilabials / labials → A (closed mouth: M B P) ──
  "m": "A",
  "b": "A",
  "p": "A",

  // ── Labiodental → G (F V) ──
  "f": "G",
  "v": "G",

  // ── Dental/Alveolar plosives + fricatives → B ──
  "t": "B",
  "d": "B",
  "s": "B",
  "z": "B",
  "n": "B",
  "r": "B",   // alveolar trill / approximant
  "ɾ": "B",   // alveolar flap (Indonesian r)

  // ── Postalveolar / palatal → B ──
  "ʃ": "B",   // sh
  "ʒ": "B",   // zh
  "tʃ": "B",  // ch
  "dʒ": "B",  // j / dj
  "j": "B",   // y/j approximant

  // ── Velar / glottal → B ──
  "k": "B",
  "ɡ": "B",   // g (IPA voiced velar)
  "g": "B",   // ASCII fallback
  "ŋ": "B",   // ng
  "h": "B",
  "ɦ": "B",   // voiced h
  "ʔ": "B",   // glottal stop (Indonesian)

  // ── Lateral → H (L) ──
  "l": "H",

  // ── Vowels ──

  // A-class: wide open (aa, ah)
  "a": "D",   // Indonesian /a/, English /ʌ/ in some transcriptions
  "aː": "D",  // long a (maaf, etc.)
  "ɑ": "D",   // English father
  "ɑː": "D",
  "ʌ": "D",   // English cup

  // C-class: mid-front (eh, ae)
  "e": "C",   // Indonesian /e/
  "eː": "C",
  "ɛ": "C",   // English bed
  "ɛː": "C",
  "æ": "C",   // English cat
  "eɪ": "C",  // English day

  // E-class: mid-back rounded (o, er)
  "o": "E",   // Indonesian /o/
  "oː": "E",
  "ɔ": "E",   // English thought
  "ɔː": "E",
  "ə": "E",   // schwa
  "ɘ": "E",   // Indonesian /ə/ (pepet)
  "ɜ": "E",   // English bird
  "ɜː": "E",
  "ɤ": "E",   // back unrounded (some espeak outputs)

  // B-class: close-mid front (i, ee)
  "i": "B",   // Indonesian /i/
  "iː": "B",
  "ɪ": "B",   // English bit

  // F-class: close back rounded (u, oo)
  "u": "F",   // Indonesian /u/
  "uː": "F",
  "ʊ": "F",   // English foot
  "oʊ": "F",  // English go
  "w": "F",   // w approximant → puckered

  // Diphthongs
  "aɪ": "D",  // English my → wide open start
  "aʊ": "D",  // English now
  "ɔɪ": "E",  // English boy
};

/**
 * Convert an IPA phone (possibly multi-char) to a Rhubarb viseme class.
 * Returns null if not mapped (will be skipped in VAS scoring).
 */
export function ipaToViseme(phone) {
  if (!phone) return null;
  const norm = phone.replace(/[ˈˌ]/g, "").trim();
  return IPA_TO_VISEME[norm] ?? null;
}

/**
 * Convert phonemizer output (array of { word, phones }) to
 * flat array of { word, phone, expectedViseme, ... } for VAS comparison.
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
        expectedVisemeName: viseme ? RHUBARB_VISEMES[viseme]?.name : "?",
        expectedMorphTarget: viseme ? RHUBARB_VISEMES[viseme]?.morphTarget : "?",
      });
    }
  }
  return result;
}

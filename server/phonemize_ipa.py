"""
Convert text to IPA phones via phonemizer (espeak-ng backend).
Usage: python phonemize_ipa.py <language> <text>
Output: JSON array of IPA phone strings (one per word, space-separated phones)

Language codes (espeak-ng):
  id  = Indonesian
  en-us = English (US)
"""
import sys
import json
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: phonemize_ipa.py <lang> <text>"}))
        sys.exit(1)

    lang = sys.argv[1]
    text = " ".join(sys.argv[2:])

    try:
        from phonemizer import phonemize
        from phonemizer.backend import EspeakBackend
        from phonemizer.separator import Separator
    except ImportError:
        print(json.dumps({"error": "phonemizer not installed. Run: pip install phonemizer"}))
        sys.exit(1)

    separator = Separator(phone=" ", word="|", syllable="")

    result = phonemize(
        text,
        backend="espeak",
        language=lang,
        separator=separator,
        strip=True,
        preserve_punctuation=False,
        with_stress=False,
    )

    # result is a string like "m aː f|t ɛ r i m a"
    # split by word delimiter "|", then each word is space-separated phones
    words_raw = result.split("|")
    words_input = text.strip().split()

    output = []
    for i, phones_str in enumerate(words_raw):
        word = words_input[i] if i < len(words_input) else ""
        phones = [p for p in phones_str.strip().split(" ") if p]
        output.append({"word": word, "phones": phones})

    print(json.dumps(output, ensure_ascii=False))

if __name__ == "__main__":
    main()

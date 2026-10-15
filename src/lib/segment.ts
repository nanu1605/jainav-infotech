/**
 * Splits text into words for word-by-word animation (spec §3). Never split by character:
 * Devanagari matras and conjuncts would break. Whitespace and punctuation stay attached to the
 * preceding word so rendering the pieces in order reproduces the text exactly.
 */
export function segmentWords(text: string, locale: string): string[] {
  const words: string[] = []
  for (const { segment, isWordLike } of new Intl.Segmenter(locale, { granularity: 'word' }).segment(
    text,
  )) {
    if (isWordLike || words.length === 0) words.push(segment)
    else words[words.length - 1] += segment
  }
  return words
}

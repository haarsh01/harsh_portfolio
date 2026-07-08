// Shared, restrained "emphasize a few exact phrases" renderer — used
// wherever verified prose needs specific real names/terms set in <strong>
// without rewriting the surrounding sentence. Splitting on a capturing
// regex group means `String.split` returns matched and unmatched segments
// in original order, so rejoining every part always reproduces the exact
// source text.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function withEmphasis(text, phrases, keyPrefix) {
  if (!phrases?.length) return text;
  const pattern = new RegExp(`(${phrases.map(escapeRegExp).join('|')})`, 'g');
  const phraseSet = new Set(phrases);

  return text
    .split(pattern)
    .filter((part) => part !== '')
    .map((part, i) => (
      phraseSet.has(part)
        ? { type: 'strong', text: part, key: `${keyPrefix}-${i}` }
        : { type: 'text', text: part, key: `${keyPrefix}-${i}` }
    ));
}

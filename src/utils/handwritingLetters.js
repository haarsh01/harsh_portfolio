// An original, hand-designed monoline cursive "font" — a small set of
// lowercase letterform generators composed left-to-right into words. This
// is not traced from any existing typeface or from Apple's Hello artwork;
// every curve below was authored here. Composing words programmatically
// (rather than hand-plotting each word's full path) keeps every letter
// visually consistent across "hello" and every rotating translation, and
// keeps the whole system small enough to review letter by letter.
//
// Shared vertical conventions (all letters sit on the same baseline/
// x-height/ascender-height so any two letters connect naturally):
const BASELINE = 190;
const XTOP = 95; // x-height letters (a, c, e, n, o, r, s, u) top edge
const ASCTOP = 45; // ascender letters (h, l, b, t) top edge
const DESCBOT = 232; // descender bottom edge (j)
const GAP = 16; // natural spacing between letters

// Each letter function takes its left cursor position `x` and returns the
// subpaths that draw it plus how far the cursor should advance — an
// "advance width", the same concept a real font's glyph metrics use.
const LETTERS = {
  h: (x) => ({
    paths: [
      `M${x},${ASCTOP} C${x - 6},90 ${x - 6},150 ${x + 2},${BASELINE}`,
      `M${x + 2},132 C${x + 20},112 ${x + 46},112 ${x + 51},132 C${x + 55},148 ${x + 51},170 ${x + 47},${BASELINE}`,
    ],
    width: 60,
  }),
  e: (x) => ({
    paths: [
      `M${x + 68},172 C${x + 66},182 ${x + 56},190 ${x + 42},190 C${x + 20},190 ${x + 6},174 ${x + 8},152` +
        ` C${x + 10},132 ${x + 30},128 ${x + 46},134 C${x + 62},140 ${x + 62},122 ${x + 44},117` +
        ` C${x + 24},112 ${x + 4},129 ${x + 4},153`,
    ],
    width: 76,
  }),
  l: (x) => ({
    paths: [`M${x + 10},${ASCTOP} C${x},90 ${x + 2},145 ${x + 12},174 C${x + 16},185 ${x + 24},190 ${x + 32},184`],
    width: 36,
  }),
  o: (x) => ({
    paths: [
      `M${x + 48},${XTOP} C${x + 22},${XTOP} ${x + 6},117 ${x + 6},142 C${x + 6},168 ${x + 24},${BASELINE} ${x + 48},${BASELINE}` +
        ` C${x + 72},${BASELINE} ${x + 90},168 ${x + 90},142 C${x + 90},117 ${x + 74},${XTOP} ${x + 48},${XTOP}`,
    ],
    width: 96,
  }),
  a: (x) => ({
    paths: [
      `M${x + 52},117 C${x + 36},108 ${x + 12},116 ${x + 8},140 C${x + 4},164 ${x + 20},188 ${x + 42},190` +
        ` C${x + 58},191 ${x + 68},178 ${x + 66},158`,
      `M${x + 66},128 C${x + 68},148 ${x + 68},172 ${x + 66},${BASELINE}`,
    ],
    width: 74,
  }),
  c: (x) => ({
    paths: [
      `M${x + 64},114 C${x + 48},98 ${x + 20},102 ${x + 8},124 C${x - 4},146 ${x + 2},174 ${x + 26},187` +
        ` C${x + 42},196 ${x + 58},191 ${x + 66},178`,
    ],
    width: 70,
  }),
  i: (x) => ({
    paths: [
      `M${x + 8},122 C${x + 4},144 ${x + 4},168 ${x + 10},${BASELINE}`,
      `M${x + 8},96 L${x + 9},94`,
    ],
    width: 24,
  }),
  b: (x) => ({
    paths: [
      `M${x + 8},${ASCTOP} C${x},90 ${x + 2},150 ${x + 6},${BASELINE}`,
      `M${x + 6},150 C${x + 22},128 ${x + 54},132 ${x + 60},158 C${x + 66},182 ${x + 44},198 ${x + 20},190` +
        ` C${x + 10},187 ${x + 6},176 ${x + 6},166`,
    ],
    width: 70,
  }),
  n: (x) => ({
    paths: [
      `M${x + 6},122 C${x + 2},146 ${x + 2},170 ${x + 6},${BASELINE}`,
      `M${x + 6},132 C${x + 22},112 ${x + 48},112 ${x + 54},132 C${x + 58},150 ${x + 54},172 ${x + 50},${BASELINE}`,
    ],
    width: 66,
  }),
  j: (x) => ({
    paths: [
      `M${x + 14},122 C${x + 18},152 ${x + 20},196 ${x + 12},${DESCBOT}` +
        ` C${x + 7},${DESCBOT + 14} ${x - 6},${DESCBOT + 18} ${x - 16},${DESCBOT + 10}`,
      `M${x + 14},96 L${x + 15},94`,
    ],
    width: 42,
  }),
  u: (x) => ({
    paths: [
      `M${x + 6},120 C${x + 2},144 ${x + 2},170 ${x + 10},184 C${x + 18},198 ${x + 42},198 ${x + 52},184` +
        ` C${x + 58},176 ${x + 60},150 ${x + 58},120`,
    ],
    width: 68,
  }),
  r: (x) => ({
    paths: [
      `M${x + 8},122 C${x + 4},146 ${x + 4},170 ${x + 8},${BASELINE}`,
      `M${x + 8},130 C${x + 16},116 ${x + 32},113 ${x + 40},122`,
    ],
    width: 46,
  }),
  s: (x) => ({
    paths: [
      `M${x + 50},116 C${x + 38},102 ${x + 14},107 ${x + 12},124 C${x + 10},142 ${x + 32},143 ${x + 42},152` +
        ` C${x + 54},163 ${x + 51},184 ${x + 32},190 C${x + 17},195 ${x + 2},188 ${x},174`,
    ],
    width: 56,
  }),
  t: (x) => ({
    paths: [
      `M${x + 16},64 C${x + 8},106 ${x + 8},156 ${x + 18},182 C${x + 21},190 ${x + 28},192 ${x + 34},187`,
      `M${x},126 C${x + 12},121 ${x + 26},121 ${x + 36},124`,
    ],
    width: 42,
  }),
  á: (x) => {
    const base = LETTERS.a(x);
    return { paths: [...base.paths, `M${x + 38},80 L${x + 48},64`], width: base.width };
  },
  ó: (x) => {
    const base = LETTERS.o(x);
    return { paths: [...base.paths, `M${x + 42},74 L${x + 52},58`], width: base.width };
  },
};

// Composes a lowercase word (accents supported via the accented letter
// keys above) into one flat list of subpaths plus the exact pixel width
// it occupies — used to size each greeting's own SVG viewBox precisely,
// rather than guessing a fixed canvas per word.
export function composeWord(word, startX = 50) {
  let cursor = startX;
  const paths = [];
  for (const char of word) {
    const letter = LETTERS[char];
    if (!letter) continue; // unsupported character — skipped, never crashes
    const { paths: letterPaths, width } = letter(cursor);
    paths.push(...letterPaths);
    cursor += width + GAP;
  }
  const totalWidth = cursor - GAP + startX;
  return { paths, width: totalWidth, height: 240 };
}

export const SUPPORTED_LETTERS = Object.keys(LETTERS);

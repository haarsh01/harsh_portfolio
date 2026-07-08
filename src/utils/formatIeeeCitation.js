// Derives an IEEE-style reference (both a plain-text string for copying
// and structured parts for JSX rendering) from verified publication
// metadata. Nothing here invents a field — a value that wasn't verified
// (see src/constants/publications.js) is simply omitted from the output,
// never replaced with a placeholder.
const OWNER_NAME = "Harsh Kaushik";

// Converts one verified full name to IEEE initials. Preserves already-
// abbreviated forms, hyphenated given names, and mononyms instead of
// applying a destructive "first letter only" transform to everything.
export function toIeeeInitials(fullName) {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return trimmed;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 1) return tokens[0]; // a single-token/mononym name is preserved as-is

  const surname = tokens[tokens.length - 1];
  const givenTokens = tokens.slice(0, -1);

  const initials = givenTokens
    .map((token) => {
      if (/^[A-Za-z]\.?$/.test(token)) return `${token[0].toUpperCase()}.`; // already an initial, e.g. "H" or "H."
      if (token.includes("-")) {
        return token
          .split("-")
          .filter(Boolean)
          .map((part) => `${part[0].toUpperCase()}.`)
          .join("-");
      }
      return `${token[0].toUpperCase()}.`;
    })
    .join(" ");

  return `${initials} ${surname}`;
}

// Builds the per-author display list, each tagged `isOwner` from an exact
// match against the full (pre-initialed) name only — a partial first- or
// last-name match never triggers the highlight.
export function formatAuthorsList(authors) {
  return (authors ?? []).map((name) => ({
    text: toIeeeInitials(name),
    isOwner: name === OWNER_NAME,
  }));
}

// Joins initialed authors IEEE-style: "A. One and B. Two" for two authors,
// "A. One, B. Two, and C. Three" (Oxford comma) for three or more.
export function formatAuthorsText(authors) {
  const initialed = (authors ?? []).map(toIeeeInitials);
  if (initialed.length === 0) return "";
  if (initialed.length === 1) return initialed[0];
  if (initialed.length === 2) return `${initialed[0]} and ${initialed[1]}`;
  return `${initialed.slice(0, -1).join(", ")}, and ${initialed[initialed.length - 1]}`;
}

// The "in <venue>, <location>, <year>, pp. <pages>[, doi: <doi>]." tail —
// shared by conference and chapter entries, which differ only in how the
// venue segment itself reads.
function buildVenueSegment(pub) {
  switch (pub.type) {
    case "conference": {
      const abbrev = pub.venueAbbreviation ? ` (${pub.venueAbbreviation})` : "";
      return `${pub.venue}${abbrev}`;
    }
    case "chapter":
    case "journal":
    case "preprint":
    case "thesis":
    default:
      return pub.venue;
  }
}

function buildDetailsSegment(pub) {
  const parts = [];
  if (pub.type === "conference" && pub.location) parts.push(pub.location);
  if (pub.type === "chapter" && pub.publisher) parts.push(pub.publisher);
  if (pub.year) parts.push(String(pub.year));

  const pageParts = [];
  if (pub.volume) pageParts.push(`vol. ${pub.volume}`);
  if (pub.issue) pageParts.push(`no. ${pub.issue}`);
  if (pub.articleNumber) pageParts.push(`Art. no. ${pub.articleNumber}`);
  else if (pub.pages) pageParts.push(`pp. ${pub.pages}`);

  return [...parts, ...pageParts].filter(Boolean).join(", ");
}

// Produces both the plain-text citation (for copying, exactly what's
// rendered — never HTML) and the structured parts a component can style
// (e.g. italicizing the venue) without concatenating markup into the data.
export function formatIeeeCitation(pub, number) {
  const authorsText = formatAuthorsText(pub.authors);
  const authorsList = formatAuthorsList(pub.authors);
  const venueSegment = buildVenueSegment(pub);
  const detailsSegment = buildDetailsSegment(pub);
  const doiSegment = pub.doi ? `doi: ${pub.doi}` : null;

  const tailParts = [`in ${venueSegment}`, detailsSegment, doiSegment].filter(Boolean);
  const plainText = `[${number}] ${authorsText}, "${pub.title}," ${tailParts.join(", ")}.`;

  return {
    number,
    authorsText,
    authorsList,
    title: pub.title,
    venueSegment,
    detailsSegment,
    doiSegment,
    plainText,
  };
}

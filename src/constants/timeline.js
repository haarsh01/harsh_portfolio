// Centralized, factual Time Machine dataset. Every entry must trace back to
// a genuinely dated artifact already in `#constants` — nothing here is
// invented. The desktop projects, the résumé PDF, and the About page carry
// no independently-verifiable date anywhere in the existing data model, so
// (per the standing "do not invent dates" constraint) they are deliberately
// NOT placed on this timeline with a fabricated year. The real, dated
// artifacts are Publications (each has a verified publication year) and
// Talks (the NSERC talk has a verified date) — this is intentionally a
// small, honest dataset rather than a padded one. The architecture (this
// file + Time Machine's rendering) supports more entries the moment more
// dated content genuinely exists.
import dayjs from "dayjs";
import { getPublications } from "#constants/publications.js";
import { getTalks } from "#constants/talks.js";

// Only the publication year itself is verified (see publications.js's own
// sourcing notes) — an exact month/day was never claimed, so January 1st is
// used purely as a stable sort anchor for that year, never displayed as a
// specific date.
const publicationEvents = getPublications().map((pub) => ({
  id: `publication-${pub.id}`,
  year: String(pub.year),
  sortDate: dayjs(`${pub.year}-01-01`).valueOf(),
  dateLabel: String(pub.year),
  title: pub.title,
  description: pub.publisher ? `Published via ${pub.publisher}.` : `Published in ${pub.venue}.`,
  category: "Publications",
  image: null,
  technologies: [],
  relatedAction: { type: "open-window", windowId: "publications", data: { publicationId: pub.id } },
}));

const talkEvents = getTalks().map((talk) => {
  const isValidDate = dayjs(talk.date).isValid();
  return {
    id: `talk-${talk.id}`,
    year: talk.year ? String(talk.year) : (isValidDate ? dayjs(talk.date).format("YYYY") : ""),
    sortDate: isValidDate ? dayjs(talk.date).valueOf() : 0,
    dateLabel: isValidDate ? dayjs(talk.date).format("MMMM D, YYYY") : String(talk.year ?? ""),
    title: talk.title,
    description: talk.eventTitle ?? talk.event ?? "Presented publicly.",
    category: "Talks",
    image: talk.heroImage?.src ?? null,
    technologies: [],
    relatedAction: { type: "open-window", windowId: "talks", data: { talkId: talk.id } },
  };
});

// A dynamic, always-accurate anchor point representing "today" — not a
// historical claim, just where the timeline's "Return to Present" control
// lands. Uses the real current date, computed once at module load.
const presentEvent = {
  id: "present",
  year: dayjs().format("YYYY"),
  sortDate: dayjs().valueOf(),
  dateLabel: dayjs().format("MMMM D, YYYY"),
  title: "Present",
  description: "You are here, exploring the portfolio. Check NexAI and Publications for Harsh's latest work.",
  category: "Present",
  image: null,
  technologies: [],
  relatedAction: { type: "about-portfolio" },
};

export const TIMELINE_EVENTS = [...publicationEvents, ...talkEvents, presentEvent]
  .sort((a, b) => a.sortDate - b.sortDate);

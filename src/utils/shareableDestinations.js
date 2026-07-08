// Strict whitelist-based schema for shareable/Handoff URLs. Every value that
// reaches the URL is one of a small set of real, derived-from-data ids —
// never a raw name, a file path, or anything else that could leak internal
// structure. Parsing is equally strict: unknown app ids or invalid
// sub-params are silently ignored rather than executed.
import { locations, photosLinks } from "#constants/index.js";
import { TIMELINE_EVENTS } from "#constants/timeline.js";
import { TOUR_STEPS } from "#constants/tour.js";

// URL-facing app ids are kebab-case and deliberately distinct from internal
// camelCase window keys — the URL should read as a destination, not leak
// the window-store's key naming.
const APP_TO_WINDOW = {
  resume: "resume",
  finder: "finder",
  contact: "contact",
  safari: "safari",
  photos: "photos",
  terminal: "terminal",
  spotify: "spotify",
  "about-portfolio": "aboutPortfolio",
  "time-machine": "timeMachine",
  "activity-monitor": "activityMonitor",
  publications: "publications",
  talks: "talks",
  letterboxd: "letterboxd",
  nexai: "nexai",
};

const LETTERBOXD_SECTION_IDS = ["overview", "reviews", "films", "lists"];
const WINDOW_TO_APP = Object.fromEntries(Object.entries(APP_TO_WINDOW).map(([app, win]) => [win, app]));

export const APP_IDS = [...Object.keys(APP_TO_WINDOW), "tour"];
const FINDER_LOCATION_IDS = Object.keys(locations).filter((key) => key !== "trash"); // Trash is not a meaningful shareable destination
const PHOTOS_SECTION_IDS = photosLinks.map((link) => link.title.toLowerCase());
const TOUR_STEP_IDS = TOUR_STEPS.map((step) => step.id);

export function slugify(text) {
  return (text ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export function findFinderItemBySlug(locationKey, itemSlug) {
  const location = locations[locationKey];
  if (!location) return null;
  return location.children?.find((child) => slugify(child.name) === itemSlug) ?? null;
}

// ---------- Building a destination from current app state (for sharing) ----------

// A Finder location can be one of the 5 top-level locations, or a project
// folder nested one level under Work — this walks both cases to produce
// {location, item?} without ever needing a third param tier.
export function getShareableFinderDestination(activeLocation) {
  if (!activeLocation) return { app: "finder" };
  if (FINDER_LOCATION_IDS.includes(activeLocation.type)) {
    return { app: "finder", location: activeLocation.type };
  }
  for (const key of FINDER_LOCATION_IDS) {
    const match = locations[key].children?.find((child) => child.id === activeLocation.id && child.kind === "folder");
    if (match) return { app: "finder", location: key, item: slugify(activeLocation.name) };
  }
  return { app: "finder" };
}

export function getShareableFinderItemDestination(locationKey, item) {
  if (!FINDER_LOCATION_IDS.includes(locationKey)) return { app: "finder" };
  return { app: "finder", location: locationKey, item: slugify(item.name) };
}

export function getShareablePhotosDestination(sectionTitle) {
  const slug = slugify(sectionTitle);
  return PHOTOS_SECTION_IDS.includes(slug) ? { app: "photos", section: slug } : { app: "photos" };
}

export function getShareableTimelineEventDestination(event) {
  return { app: "time-machine", event: event.id };
}

export function getShareableTourStepDestination(stepId) {
  return TOUR_STEP_IDS.includes(stepId) ? { app: "tour", step: stepId } : { app: "tour" };
}

export function getShareableWindowDestination(windowKey) {
  const app = WINDOW_TO_APP[windowKey];
  return app ? { app } : null;
}

// Shared fallback for items keyed by name rather than a prefixed id —
// Finder's own local selection adapter (`normalizeFinderItem`) and its
// Quick Look adapter both produce `{ name, kind }` shapes with no prefixed
// id this file's other resolvers can match on, so both fall back here to
// resolve by kind + name instead.
function resolveDestinationByKindAndName(kind, name) {
  switch (kind) {
    case "pdf":
      return { app: "resume" };
    case "music":
      return { app: "spotify" };
    case "contact":
      return { app: "contact" };
    case "image": {
      const aboutChild = locations.about.children?.find((c) => c.name === name);
      return aboutChild ? getShareableFinderItemDestination("about", aboutChild) : { app: "photos", section: "library" };
    }
    case "text": {
      const aboutChild = locations.about.children?.find((c) => c.name === name);
      return aboutChild ? getShareableFinderItemDestination("about", aboutChild) : null;
    }
    case "project":
    case "folder": {
      for (const key of FINDER_LOCATION_IDS) {
        const match = locations[key].children?.find((c) => c.name === name);
        if (match) return getShareableFinderItemDestination(key, match);
      }
      return null;
    }
    default:
      return null;
  }
}

// Best-effort resolver for a normalized portfolio item (Get Info / Quick
// Look / Spotlight results) — every branch maps back to a real, already
// -defined destination; unrecognized shapes simply aren't shareable.
export function getShareableItemDestination(item) {
  if (!item) return null;
  switch (true) {
    case item.id === "document-resume":
      return { app: "resume" };
    case item.id === "document-about-me":
      return getShareableFinderItemDestination("about", item);
    case item.id?.startsWith("about-image-"): {
      const child = locations.about.children?.find((c) => c.name === item.name);
      return child ? getShareableFinderItemDestination("about", child) : { app: "photos" };
    }
    case item.id?.startsWith("gallery-image-"):
      return { app: "photos", section: "library" };
    case item.id?.startsWith("project-"): {
      const project = locations.work.children?.find((p) => `project-${p.id}` === item.id);
      return project ? getShareableFinderItemDestination("work", project) : { app: "finder", location: "work" };
    }
    case item.id === "music-spotify-playlist":
      return { app: "spotify" };
    case item.id === "contact-window" || item.id?.startsWith("contact-social-"):
      return { app: "contact" };
    // Finder's own selection adapter (normalizeFinderItem) uses a
    // completely different id scheme (`finder-<location>-<id>-<name>`) from
    // every case above — resolve those by kind + name instead.
    case item.id?.startsWith("finder-"):
      return resolveDestinationByKindAndName(item.kind, item.name);
    default:
      return null;
  }
}

// Handles items shaped like a Quick Look entry (from Finder's own local
// adapter, or from portfolioItems.js) where an explicit `shareDestination`
// wasn't already attached at creation time.
export function getShareableQuickLookDestination(qlItem) {
  if (!qlItem) return null;
  if (qlItem.shareDestination) return qlItem.shareDestination;
  return resolveDestinationByKindAndName(qlItem.kind, qlItem.name);
}

// ---------- Human-readable title for the Handoff panel ----------

export function getDestinationTitle(destination) {
  if (!destination) return "Portfolio";
  switch (destination.app) {
    case "resume": return "Resume";
    case "contact": return "Contact";
    case "terminal": return "Skills";
    case "spotify": return "Spotify Playlist";
    case "about-portfolio": return "About This Portfolio";
    case "activity-monitor": return "Activity Monitor";
    case "publications": return "Publications";
    case "talks": return "Talks";
    case "letterboxd": {
      if (destination.section === "reviews") return "Letterboxd — Reviews";
      if (destination.section === "films") return "Letterboxd — Films";
      if (destination.section === "lists") return "Letterboxd — Lists";
      return "Letterboxd";
    }
    case "finder": {
      if (destination.location && destination.item) {
        const item = findFinderItemBySlug(destination.location, destination.item);
        if (item) return item.name;
      }
      if (destination.location === "work") return "Finder — Work";
      if (destination.location === "about") return "Finder — About me";
      if (destination.location === "resume") return "Finder — Resume";
      if (destination.location === "publications") return "Finder — Publications";
      return "Finder";
    }
    case "photos":
      if (destination.section) {
        const match = photosLinks.find((link) => link.title.toLowerCase() === destination.section);
        if (match) return `Photos — ${match.title}`;
      }
      return "Photos";
    case "safari": return "Field Notes";
    case "time-machine": {
      if (destination.event) {
        const event = TIMELINE_EVENTS.find((e) => e.id === destination.event);
        if (event) return `Time Machine — ${event.title}`;
      }
      return "Time Machine";
    }
    case "tour":
      return "Guided Portfolio Tour";
    default:
      return "Portfolio";
  }
}

// ---------- URL encode / decode ----------

const PARAM_KEYS = ["app", "location", "item", "section", "post", "event", "step"];

export function encodeDestination(destination) {
  const params = new URLSearchParams();
  PARAM_KEYS.forEach((key) => {
    if (destination[key]) params.set(key, destination[key]);
  });
  return params;
}

export function buildShareUrl(destination) {
  const params = encodeDestination(destination);
  const query = params.toString();
  return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
}

// Strictly validates every field against its own whitelist — anything
// unrecognized is dropped rather than passed through, so nothing beyond
// these exact shapes can ever reach the destination opener.
export function parseDestinationFromSearch(search) {
  const params = new URLSearchParams(search);
  const app = params.get("app");
  if (!app || !APP_IDS.includes(app)) return null;

  const destination = { app };

  if (app === "finder") {
    const location = params.get("location");
    if (location && FINDER_LOCATION_IDS.includes(location)) {
      destination.location = location;
      const item = params.get("item");
      if (item && findFinderItemBySlug(location, item)) destination.item = item;
    }
  } else if (app === "photos") {
    const section = params.get("section");
    if (section && PHOTOS_SECTION_IDS.includes(section)) destination.section = section;
  } else if (app === "letterboxd") {
    const section = params.get("section");
    if (section && LETTERBOXD_SECTION_IDS.includes(section)) destination.section = section;
  } else if (app === "time-machine") {
    const event = params.get("event");
    if (event && TIMELINE_EVENTS.some((e) => e.id === event)) destination.event = event;
  } else if (app === "tour") {
    const step = params.get("step");
    if (step && TOUR_STEP_IDS.includes(step)) destination.step = step;
  }

  return destination;
}

export function getWindowKeyForApp(app) {
  return APP_TO_WINDOW[app] ?? null;
}

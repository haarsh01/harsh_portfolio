// Single normalized model for real portfolio content, shared by Desktop
// Stacks, Get Info, and Quick Look (via `toQuickLookEntry`) so none of them
// invent their own competing definition of what a "project" or "photo" is.
// Every item here is derived from `#constants` — nothing is authored here.
import {
  locations, dockApps, socials, gallery, techStack, SPOTIFY_PLAYLIST, WINDOW_CONFIG,
} from "#constants";

export const KIND_LABEL = {
  image: "Image",
  text: "Text File",
  pdf: "PDF Document",
  project: "Project",
  folder: "Folder",
  link: "Link",
  blog: "Article",
  music: "Playlist",
  contact: "Contact",
  stack: "Stack",
  unknown: "Item",
};

const KIND_LABEL_PLURAL = {
  image: "Images",
  text: "Text Files",
  pdf: "PDF Documents",
  project: "Projects",
  folder: "Folders",
  link: "Links",
  blog: "Articles",
  music: "Playlists",
  contact: "Contacts",
  unknown: "Items",
};

const CATEGORY_ORDER = ["Projects", "Documents", "Photography", "Research", "Music", "Contact"];

const fileExtension = (name) => {
  const match = /\.([a-zA-Z0-9]+)$/.exec(name ?? "");
  return match ? match[1].toUpperCase() : null;
};

function buildProjectItems() {
  return (locations.work.children ?? []).map((project) => {
    const textChild = project.children?.find((child) => child.fileType === "txt");
    const urlChild = project.children?.find((child) => child.fileType === "url");
    const figChild = project.children?.find((child) => child.fileType === "fig");

    // A direct-launch "app" project (NexAI, Portfolio OS) has a real
    // dedicated window rather than a folder of files to browse — opening
    // it should focus that window directly, not navigate Finder into an
    // (often single-file) folder.
    const action = project.kind === "app" && project.windowId
      ? { type: "open-window", windowId: project.windowId }
      : { type: "open-finder-location", location: project };

    return {
      id: `project-${project.id}`,
      name: project.name,
      kind: "project",
      category: "Projects",
      icon: project.icon,
      action,
      metadata: {
        location: "Finder › Work",
        description: textChild?.description ?? null,
        itemCount: project.children?.length ?? 0,
        liveUrl: urlChild?.href ?? null,
        designUrl: figChild?.href ?? null,
      },
    };
  });
}

function buildPhotographyItems() {
  const aboutImages = (locations.about.children ?? [])
    .filter((child) => child.fileType === "img")
    .map((child) => ({
      id: `about-image-${child.id}`,
      name: child.name,
      kind: "image",
      category: "Photography",
      icon: child.icon,
      action: { type: "open-window", windowId: "imgfile", data: { name: child.name, imageUrl: child.imageUrl } },
      metadata: {
        location: "Finder › About me",
        album: "About Me",
        imageUrl: child.imageUrl,
        fileExtension: fileExtension(child.name),
      },
    }));

  const galleryImages = gallery.map((photo, idx) => {
    const name = `Photo ${idx + 1}`;
    return {
      id: `gallery-image-${photo.id}`,
      name,
      kind: "image",
      category: "Photography",
      icon: "/images/image.png",
      action: { type: "open-window", windowId: "imgfile", data: { name, imageUrl: photo.img } },
      metadata: {
        location: "Gallery › Library",
        album: "Library",
        imageUrl: photo.img,
        fileExtension: fileExtension(photo.img),
      },
    };
  });

  return [...aboutImages, ...galleryImages];
}

function buildDocumentItems() {
  const aboutTxt = (locations.about.children ?? []).find((child) => child.fileType === "txt");
  const items = [
    {
      id: "document-resume",
      name: "Resume.pdf",
      kind: "pdf",
      category: "Documents",
      icon: "/images/pdf.png",
      action: { type: "open-window", windowId: "resume" },
      metadata: {
        location: "Finder › Resume",
        fileExtension: "PDF",
        downloadUrl: "files/resume.pdf",
      },
    },
  ];

  if (aboutTxt) {
    items.push({
      id: "document-about-me",
      name: aboutTxt.name,
      kind: "text",
      category: "Documents",
      icon: aboutTxt.icon,
      action: { type: "open-window", windowId: "txtfile", data: aboutTxt },
      metadata: {
        location: "Finder › About me",
        subtitle: aboutTxt.subtitle ?? null,
        image: aboutTxt.image ?? null,
        description: aboutTxt.description ?? null,
        fileExtension: fileExtension(aboutTxt.name),
      },
    });
  }

  return items;
}

// There is no verified original writing beyond the NSERC talk story (which
// already has its own full Talks detail view) — Field Notes (formerly
// "Safari"/blog) renders an honest empty state instead of a research-item
// list, so there is nothing real to normalize here yet.

function buildMusicItems() {
  return [{
    id: "music-spotify-playlist",
    name: SPOTIFY_PLAYLIST.title,
    kind: "music",
    category: "Music",
    icon: SPOTIFY_PLAYLIST.icon,
    action: { type: "open-window", windowId: "spotify" },
    metadata: {
      location: "Dock › Spotify",
      description: SPOTIFY_PLAYLIST.description,
      image: SPOTIFY_PLAYLIST.icon,
      externalUrl: SPOTIFY_PLAYLIST.publicUrl,
    },
  }];
}

function buildContactItems() {
  const socialItems = socials.map((social) => ({
    id: `contact-social-${social.id}`,
    name: social.text,
    kind: "link",
    category: "Contact",
    icon: social.icon,
    action: { type: "external-link", url: social.link },
    metadata: {
      location: "Contact › Socials",
      externalUrl: social.link,
    },
  }));

  const contactWindow = {
    id: "contact-window",
    name: "Contact Harsh",
    kind: "contact",
    category: "Contact",
    icon: "/images/contact.png",
    action: { type: "open-window", windowId: "contact" },
    metadata: {
      location: "Dock › Contact",
      description: "Let's Connect",
      socialCount: socials.length,
    },
  };

  return [contactWindow, ...socialItems];
}

let cachedItems = null;

// Built once from static constants and cached, mirroring the search
// registry's caching convention — recomputing per render would just
// re-derive the same data from the same unchanging constants.
export function getDesktopItems() {
  if (cachedItems) return cachedItems;
  cachedItems = [
    ...buildProjectItems(),
    ...buildDocumentItems(),
    ...buildPhotographyItems(),
    ...buildMusicItems(),
    ...buildContactItems(),
  ];
  return cachedItems;
}

// The desktop's own icon set — every real project folder plus the two
// individual document files (about-me.txt, Resume.pdf) that belong
// directly on the desktop, not just nested inside Finder. Photos, blog
// posts, music, and contact/socials are real portfolio items too, but were
// never desktop icons in this design, so they're deliberately excluded
// here.
// Publications and Talks are real, credible research-credibility windows
// but aren't part of the Work folder's project tree (they're each their
// own dedicated Finder "Favorites" location) — these two synthetic
// shortcuts give them equal desktop-level prominence to NexAI without
// duplicating their content a second time or forcing them into Work.
const PUBLICATIONS_DESKTOP_SHORTCUT = {
  id: "shortcut-publications",
  name: "Publications",
  kind: "project",
  category: "Projects",
  icon: "/icons/edit.svg", // matches the Finder sidebar's own Publications icon
  action: { type: "open-window", windowId: "publications" },
};

const TALKS_DESKTOP_SHORTCUT = {
  id: "shortcut-talks",
  name: "Talks",
  kind: "project",
  category: "Projects",
  icon: "/icons/share.svg", // a closer semantic fit than the Finder sidebar's own (reused) wifi.svg
  action: { type: "open-window", windowId: "talks" },
};

export function getDesktopIconItems() {
  const items = getDesktopItems();
  const projects = items.filter((item) => item.kind === "project");
  const about = items.find((item) => item.id === "document-about-me");
  const resume = items.find((item) => item.id === "document-resume");
  return [...projects, PUBLICATIONS_DESKTOP_SHORTCUT, TALKS_DESKTOP_SHORTCUT, about, resume].filter(Boolean);
}

function formatGroupLabel(key, mode) {
  if (mode === "kind") return KIND_LABEL_PLURAL[key] ?? key;
  return key;
}

// Groups desktop items by the requested dimension. Every bucket produced is
// guaranteed non-empty since buckets are only created when an item lands in
// them — there is no pre-declared list of "possible" groups to leave empty.
export function groupPortfolioItems(items, mode) {
  const buckets = new Map();

  items.forEach((item) => {
    let key;
    if (mode === "kind") key = item.kind;
    else if (mode === "year") key = item.metadata?.year ?? "Unspecified";
    else key = item.category;

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(item);
  });

  const groups = Array.from(buckets.entries()).map(([key, groupItems]) => ({
    key,
    label: formatGroupLabel(key, mode),
    items: groupItems,
  }));

  if (mode === "category") {
    groups.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.key);
      const bi = CATEGORY_ORDER.indexOf(b.key);
      return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi);
    });
  } else if (mode === "year") {
    groups.sort((a, b) => {
      if (a.key === "Unspecified") return 1;
      if (b.key === "Unspecified") return -1;
      return b.key.localeCompare(a.key);
    });
  } else {
    groups.sort((a, b) => a.label.localeCompare(b.label));
  }

  return groups;
}

// Executes a normalized item's (or menu action's) serializable action
// descriptor. Store setters are passed in rather than imported here so this
// module stays a pure data layer with no store coupling.
export function runItemAction(action, context) {
  if (!action || !context) return;
  switch (action.type) {
    case "open-window":
      context.openWindow(action.windowId, action.data ?? null);
      break;
    case "open-finder-location":
      context.setActiveLocation(action.location);
      context.openWindow("finder");
      break;
    case "external-link":
      if (action.url) window.open(action.url, "_blank", "noopener,noreferrer");
      break;
    default:
      break;
  }
}

export function getCopyableLink(item) {
  const m = item?.metadata ?? {};
  return m.externalUrl ?? m.liveUrl ?? m.designUrl ?? null;
}

const RELATED_APP_NAMES = {
  finder: "Portfolio (Finder)",
  contact: "Contact",
  resume: "Resume",
  safari: "Field Notes",
  photos: "Gallery (Photos)",
  terminal: "Skills (Terminal)",
  spotify: "Spotify",
  txtfile: "Text Viewer",
  imgfile: "Image Viewer",
  aboutPortfolio: "About This Portfolio",
  nexai: "NexAI",
  publications: "Publications",
  talks: "Talks",
  github: "GitHub",
  letterboxd: "Letterboxd",
  activityMonitor: "Activity Monitor",
};

function getRelatedAppName(action) {
  if (!action) return null;
  if (action.type === "open-window") return RELATED_APP_NAMES[action.windowId] ?? null;
  if (action.type === "open-finder-location") return RELATED_APP_NAMES.finder;
  return null;
}

function getExternalLinkLabel(item) {
  switch (item.kind) {
    case "blog": return "Article Link";
    case "music": return "Playlist Link";
    case "link": return item.category === "Contact" ? "Profile Link" : "Link";
    default: return "External Link";
  }
}

// Builds the ordered, factual Get Info rows for a normalized item. A field
// is only ever pushed when the underlying value actually exists — there is
// no fallback/placeholder branch, so missing metadata is simply omitted.
export function getInfoFields(item) {
  const m = item.metadata ?? {};
  const rows = [];

  rows.push({ label: "Name", value: item.name });
  rows.push({ label: "Kind", value: KIND_LABEL[item.kind] ?? "Item" });
  if (item.category) rows.push({ label: "Category", value: item.category });
  if (m.location) rows.push({ label: "Location", value: m.location });
  if (m.fileExtension) rows.push({ label: "File Type", value: m.fileExtension });
  if (m.date) rows.push({ label: item.kind === "blog" ? "Published" : "Date", value: m.date });
  if (m.year) rows.push({ label: "Year", value: m.year });
  if (m.album) rows.push({ label: "Album", value: m.album });
  if (m.itemCount != null) rows.push({ label: "Items", value: `${m.itemCount} item${m.itemCount === 1 ? "" : "s"}` });

  const relatedApp = getRelatedAppName(item.action);
  if (relatedApp) rows.push({ label: "Related Application", value: relatedApp });

  if (m.liveUrl) rows.push({ label: "Live Site", value: m.liveUrl, href: m.liveUrl });
  if (m.designUrl) rows.push({ label: "Design File", value: m.designUrl, href: m.designUrl });
  if (m.externalUrl) rows.push({ label: getExternalLinkLabel(item), value: m.externalUrl, href: m.externalUrl });
  if (m.downloadUrl) rows.push({ label: "Download", value: "Resume.pdf", href: m.downloadUrl, download: true });

  return rows;
}

// Converts a normalized item into the shape Quick Look's preview renderer
// understands. `openFn` is supplied by the caller (which already holds the
// store hooks needed to actually run the item's action) so this stays a
// pure data-shaping function.
export function toQuickLookEntry(item, openFn) {
  const m = item.metadata ?? {};
  const base = { id: item.id, name: item.name, icon: item.icon, open: openFn };

  switch (item.kind) {
    case "image":
      return { ...base, kind: "image", imageUrl: m.imageUrl };
    case "text":
      return { ...base, kind: "text", subtitle: m.subtitle, image: m.image, description: m.description };
    case "pdf":
      return { ...base, kind: "pdf" };
    case "project":
      return { ...base, kind: "project", description: m.description, childCount: m.itemCount };
    case "folder":
      return { ...base, kind: "folder", childCount: m.itemCount };
    case "link":
      return { ...base, kind: "link", href: m.externalUrl };
    case "blog":
      return { ...base, kind: "blog", image: m.image, date: m.date, href: m.externalUrl };
    case "music":
      return { ...base, kind: "music", image: m.image, description: m.description, href: m.externalUrl };
    case "contact":
      return { ...base, kind: "contact", description: m.description, socialCount: m.socialCount };
    default:
      return { ...base, kind: "unknown" };
  }
}

// Normalizes a raw Finder location-tree item (folder or leaf file) into the
// same canonical shape used everywhere else, for Get Info / selection
// tracking. Finder's own Quick Look adapter stays separate and untouched —
// it already carries Finder-specific fields (drag position, etc.) and is
// verified working; this is purely an additive read path for Get Info.
export function normalizeFinderItem(item, locationLabel) {
  const base = { id: `finder-${locationLabel}-${item.id}-${item.name}`, name: item.name, icon: item.icon };

  if (item.kind === "folder") {
    const textChild = item.children?.find((child) => child.fileType === "txt");
    const isProject = Boolean(textChild?.description);
    const urlChild = item.children?.find((child) => child.fileType === "url");
    const figChild = item.children?.find((child) => child.fileType === "fig");
    return {
      ...base,
      kind: isProject ? "project" : "folder",
      category: isProject ? "Projects" : "Folder",
      action: { type: "open-finder-location", location: item },
      metadata: {
        location: `Finder › ${locationLabel}`,
        description: textChild?.description ?? null,
        itemCount: item.children?.length ?? 0,
        liveUrl: urlChild?.href ?? null,
        designUrl: figChild?.href ?? null,
      },
    };
  }

  switch (item.fileType) {
    case "img":
      return {
        ...base,
        kind: "image",
        category: "Photography",
        action: { type: "open-window", windowId: "imgfile", data: { name: item.name, imageUrl: item.imageUrl } },
        metadata: { location: `Finder › ${locationLabel}`, imageUrl: item.imageUrl, fileExtension: fileExtension(item.name) },
      };
    case "txt":
      return {
        ...base,
        kind: "text",
        category: "Documents",
        action: { type: "open-window", windowId: "txtfile", data: item },
        metadata: {
          location: `Finder › ${locationLabel}`,
          subtitle: item.subtitle ?? null,
          image: item.image ?? null,
          description: item.description ?? null,
          fileExtension: fileExtension(item.name),
        },
      };
    case "pdf":
      return {
        ...base,
        kind: "pdf",
        category: "Documents",
        action: { type: "open-window", windowId: "resume" },
        metadata: { location: `Finder › ${locationLabel}`, fileExtension: "PDF", downloadUrl: "files/resume.pdf" },
      };
    case "fig":
    case "url":
      return {
        ...base,
        kind: "link",
        category: "Projects",
        action: { type: "external-link", url: item.href },
        metadata: { location: `Finder › ${locationLabel}`, externalUrl: item.href },
      };
    default:
      return {
        ...base,
        kind: "unknown",
        category: "Other",
        action: null,
        metadata: { location: `Finder › ${locationLabel}` },
      };
  }
}

// Registered, launchable portfolio applications — derived from `dockApps`
// (already filtered to real, openable apps) plus the handful of windows
// that have a genuine launch point but no Dock icon (Resume, About This
// Portfolio). Deliberately excludes generic file-viewer windows
// (txtfile/imgfile) and Trash, which has no WINDOW_CONFIG entry at all.
export function getRegisteredApplications() {
  const fromDock = dockApps
    .filter((app) => app.canOpen && WINDOW_CONFIG[app.id])
    .map((app) => ({ key: app.id, name: app.name, icon: `/images/${app.icon}` }));

  const extras = [];
  if (WINDOW_CONFIG.resume) extras.push({ key: "resume", name: "Resume", icon: "/images/pdf.png" });
  if (WINDOW_CONFIG.aboutPortfolio) extras.push({ key: "aboutPortfolio", name: "About This Portfolio", icon: null });
  if (WINDOW_CONFIG.timeMachine) extras.push({ key: "timeMachine", name: "Time Machine", icon: null });
  if (WINDOW_CONFIG.activityMonitor) extras.push({ key: "activityMonitor", name: "Activity Monitor", icon: null });
  if (WINDOW_CONFIG.publications) extras.push({ key: "publications", name: "Publications", icon: null });
  if (WINDOW_CONFIG.talks) extras.push({ key: "talks", name: "Talks", icon: null });

  return [...fromDock, ...extras];
}

export function getTechStack() {
  return techStack;
}

// Small, reusable searchable-text projection for a normalized item — kept
// here (not wired into any UI this batch) so later batches (Spotlight) can
// reuse the same normalized items without a second extraction pass.
export function getSearchableText(item) {
  const m = item.metadata ?? {};
  return [item.name, item.category, item.kind, m.location, m.description]
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

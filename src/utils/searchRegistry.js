// Builds the searchable entry list Spotlight (and its predecessor, Help
// Search) rank against. This is the single registry — every destination is
// derived from real `#constants` data or the shared normalized portfolio
// items (`#utils/portfolioItems.js`), never hand-duplicated a second time.
// Entries that ARE covered by `getDesktopItems()` (projects, Resume,
// about-me.txt, photos, Spotify, contact/socials) are built
// from there directly; only destinations that model doesn't cover
// (Applications, Skills, Photos *sections*, Actions, Settings, Help) get
// their own small builder here.
import {
  FileText, Folder, Terminal as TerminalIcon, Cpu, Image as ImageIcon,
  Star, Clock, MapPin, Users, HelpCircle, LayoutGrid, Minimize2, Compass,
  Eye, Info, AppWindow, History,
  Pencil, Palette, GraduationCap, Mic, Film, Github, Activity, ShieldCheck, MessageCircleMore,
} from "lucide-react";
import { locations, techStack, photosLinks } from "#constants/index.js";
import { NEXAI } from "#constants/nexai.js";
import { GITHUB_PROFILE } from "#constants/github.js";
import {
  getDesktopItems, getRegisteredApplications, KIND_LABEL,
} from "#utils/portfolioItems.js";
import { prepareEntry } from "#utils/portfolioSearch.js";
import { getPublications } from "#constants/publications.js";
import { getTalks } from "#constants/talks.js";
import { getLetterboxdFilms, getLetterboxdReviews } from "#constants/letterboxd.js";

const PHOTOS_SECTION_KEYWORDS = {
  Library: ["photos", "photo", "gallery", "images", "pictures", "photography", "album", "albums", "photo library", "library"],
  Memories: ["memories", "highlights", "moments", "photo memories"],
  Places: ["places", "locations", "travel photos", "cities", "where"],
  People: ["people", "portraits", "friends", "colleagues", "event photos"],
  Favorites: ["favorites", "favourites", "favorite photos", "favourite photos", "liked photos", "best photos"],
};

const PHOTOS_SECTION_ICONS = {
  Library: ImageIcon,
  Memories: Clock,
  Places: MapPin,
  People: Users,
  Favorites: Star,
};

// Aliases for tech-stack items whose display name differs from how people
// actually type it (e.g. "React.js" vs. "react").
const TECH_ALIASES = {
  "react.js": ["react", "reactjs"],
  "next.js": ["nextjs", "next js", "next"],
  "react native": ["reactnative"],
  "typescript": ["ts"],
  "node.js": ["nodejs", "node"],
  "tailwind css": ["tailwind"],
  "postgresql": ["postgres", "sql"],
  "mongodb": ["mongo", "nosql"],
};

// A handful of real, pre-existing curated keyword sets (originally authored
// for Help Search) that add genuine search value beyond what's
// auto-derived from a normalized item's name/category/location — reused
// verbatim, keyed by the item's stable id, rather than re-typed.
const EXTRA_KEYWORDS = {
  "document-resume": ["cv", "résumé", "curriculum vitae", "experience", "work experience", "employment", "career", "download resume", "view resume", "pdf"],
  "document-about-me": ["about", "about me", "bio", "biography", "profile", "introduction", "who is harsh", "background", "meet harsh"],
  "contact-window": ["email", "mail", "message", "hire", "hire harsh", "collaborate", "opportunity", "job", "get in touch", "reach out", "email harsh"],
  "music-spotify-playlist": ["spotify", "music", "playlist", "songs", "listen", "audio", "play"],
  "contact-social-1": ["github", "git", "code", "source code", "repositories", "repository", "repos", "open source"],
  "contact-social-2": ["linkedin", "professional", "network", "career profile", "connect"],
};

// Spotlight's own presentation category, distinct from (but derived from)
// the Stacks/Get Info category — matches the batch spec's suggested result
// taxonomy (e.g. "Writing" instead of "Research") without changing what
// Stacks/Get Info already display for the same item.
function displayCategory(item) {
  if (item.kind === "link" && item.category === "Contact") return "Social";
  if (item.category === "Research") return "Writing";
  if (item.category === "Photography") return "Photos";
  return item.category;
}

export const HELP_TOPICS = [
  {
    id: "using-the-dock",
    title: "Using the Dock",
    body: [
      "Click any Dock icon to open that app. Click it again to bring it to the front.",
      "A small dot appears beneath the icons of apps that are currently running.",
    ],
  },
  {
    id: "moving-resizing-windows",
    title: "Moving and resizing windows",
    body: [
      "Drag a window by its title bar to move it around the desktop.",
      "Hover any edge or corner until the resize cursor appears, then drag to resize.",
      "Use the red, yellow, and green buttons in the title bar to close, minimize, and maximize a window.",
    ],
  },
  {
    id: "opening-files-in-finder",
    title: "Opening files in Finder",
    body: [
      "Choose Work, About me, Resume, or Trash from the Finder sidebar to browse its contents.",
      "Click a text file, image, or the résumé to open it in its own window.",
      "Right-click any item for Open, Quick Look, Get Info, and Copy Link.",
    ],
  },
  {
    id: "navigating-photos",
    title: "Navigating Photos",
    body: [
      "Use the sidebar to switch between Library, Memories, Places, People, and Favorites.",
      "Click any photo in Library to view it full-size with zoom controls.",
    ],
  },
  {
    id: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    body: ["These shortcuts work anywhere in the portfolio:"],
    shortcuts: [
      { keys: "Cmd/Ctrl + Space", description: "Open Spotlight" },
      { keys: "Space", description: "Quick Look the selected item" },
      { keys: "Cmd/Ctrl + →/←", description: "Switch between open apps" },
      { keys: "Ctrl + ↑", description: "Mission Control" },
      { keys: "Cmd/Ctrl + I", description: "Get Info for the selected item" },
      { keys: "↑ / ↓", description: "Move through results" },
      { keys: "Enter", description: "Open the selected result" },
      { keys: "Esc", description: "Close the active overlay" },
    ],
  },
  {
    id: "contacting-harsh",
    title: "Contacting Harsh",
    body: ["Open the Contact window for Harsh's email address and social links."],
    action: { type: "open-window", windowId: "contact" },
    actionLabel: "Open Contact",
  },
  {
    id: "guided-tour",
    title: "Taking the guided tour",
    body: [
      "The guided Portfolio Tour walks through Harsh's introduction, a featured project, skills, writing, photography, résumé, and contact info — one step at a time.",
      "A Live Activity capsule appears in the menu bar while it's running, with Previous, Pause/Resume, Next, and Exit controls. Clicking the capsule focuses the current step's window.",
    ],
    action: { type: "start-tour" },
    actionLabel: "Start Portfolio Tour",
  },
];

const HELP_TOPIC_KEYWORDS = {
  "using-the-dock": ["dock", "open apps", "running apps", "app icons", "how to use the dock"],
  "moving-resizing-windows": ["resize window", "resize", "drag", "move window", "minimize", "maximize", "window controls", "traffic lights", "drag windows"],
  "opening-files-in-finder": ["how to use finder", "finder", "open files", "browse files", "navigate finder", "get info", "quick look"],
  "navigating-photos": ["how to use photos", "photos navigation", "navigate photos", "photo sections"],
  "keyboard-shortcuts": ["keyboard shortcuts", "shortcuts", "keyboard", "hotkeys", "spotlight shortcut"],
  "contacting-harsh": ["contacting harsh", "how to contact", "reach out"],
  "guided-tour": ["tour", "guided tour", "portfolio tour", "walkthrough", "start tour", "live activity"],
};

export const QUICK_LINK_IDS = ["item-document-resume", "projects-shortcut", "app-terminal", "photos-library", "item-contact-window", "app-spotify"];

function buildApplicationEntries() {
  return getRegisteredApplications().map((app) => ({
    id: `app-${app.key}`,
    title: app.name,
    subtitle: "Application",
    category: "Applications",
    icon: app.icon ? null : AppWindow,
    image: app.icon,
    keywords: ["open", "app", "application", "launch", app.name.toLowerCase()],
    action: { type: "focus-window", windowId: app.key },
  }));
}

// One entry per normalized portfolio item (Projects, Documents, Photos,
// Writing, Music, Contact/Social) — the exact same items Stacks and Get
// Info already show, so nothing here can drift from what those surfaces
// display.
function buildPortfolioItemEntries() {
  return getDesktopItems().map((item) => {
    const extra = EXTRA_KEYWORDS[item.id] ?? [];
    const base = [item.name, item.category, item.kind, item.metadata?.location, item.metadata?.album]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .split(/\s+/);

    return {
      id: `item-${item.id}`,
      title: item.name,
      subtitle: item.metadata?.location ?? KIND_LABEL[item.kind],
      category: displayCategory(item),
      image: item.icon,
      keywords: [...base, ...extra],
      action: item.action,
      quickLookItem: item,
      getInfoItem: item,
    };
  });
}

function buildSkillEntries() {
  const entries = [];
  techStack.forEach(({ category, items }) => {
    items.forEach((item) => {
      const aliasKey = item.toLowerCase();
      entries.push({
        id: `tech-${aliasKey}`,
        title: item,
        subtitle: `Skills › ${category}`,
        category: "Skills",
        icon: Cpu,
        aliases: TECH_ALIASES[aliasKey] ?? [],
        keywords: [item.toLowerCase(), category.toLowerCase(), "skill", "skills"],
        action: { type: "open-terminal-item", skill: item },
      });
    });
  });
  return entries;
}

function buildPhotoSectionEntries() {
  return photosLinks
    .filter(({ title }) => PHOTOS_SECTION_KEYWORDS[title])
    .map(({ title }) => ({
      id: `photos-${title.toLowerCase()}`,
      title,
      subtitle: `Photos › ${title}`,
      category: "Photos",
      icon: PHOTOS_SECTION_ICONS[title] ?? ImageIcon,
      keywords: PHOTOS_SECTION_KEYWORDS[title],
      action: { type: "open-photos-section", section: title.toLowerCase() },
    }));
}

function buildShortcutEntries() {
  return [
    {
      id: "projects-shortcut",
      title: "Projects",
      subtitle: "Finder › Work",
      category: "Projects",
      icon: Folder,
      keywords: ["project", "projects", "work", "portfolio", "case study", "case studies", "show projects"],
      action: { type: "open-finder-location", location: locations.work },
    },
  ];
}

// One general entry for the section itself, plus one per verified
// publication so a specific paper title jumps straight to (and highlights)
// that entry — derived from the single verified publications list, never
// hand-duplicated here.
function buildPublicationEntries() {
  const general = {
    id: "action-publications",
    title: "Publications",
    subtitle: "Peer-reviewed research, IEEE style",
    category: "Publications",
    icon: GraduationCap,
    keywords: ["publications", "papers", "research papers", "research", "google scholar", "scholar", "ieee", "citations", "bibliography"],
    action: { type: "open-publications" },
  };

  const perPaper = getPublications().map((pub) => ({
    id: `publication-${pub.id}`,
    title: pub.title,
    subtitle: `Publications › ${pub.year}`,
    category: "Publications",
    icon: GraduationCap,
    keywords: [pub.title.toLowerCase(), ...pub.authors.map((a) => a.toLowerCase()), "publication", "paper"],
    action: { type: "open-publication", id: pub.id },
  }));

  return [general, ...perPaper];
}

// Same pattern as buildPublicationEntries — one general entry plus one per
// verified talk, derived from the single talks data source. `getTalks()`
// may legitimately be empty; that just means no per-talk entries exist
// yet, not an error.
function buildTalkEntries() {
  const allTalks = getTalks();
  const general = {
    id: "action-talks",
    title: "Talks",
    // Honest about volume, matching the Talks window's own intro line —
    // never implies a larger speaking archive than what's actually here.
    subtitle: allTalks.length === 1
      ? "One featured talk, presented to an industry audience"
      : "Talks, presentations, and research demonstrations",
    category: "Talks",
    icon: Mic,
    keywords: ["talks", "talk", "speaking", "presentation", "presentations", "seminar", "demo", "research talk", "conference talk", "thesis defence"],
    action: { type: "open-talks" },
  };

  // Featured talks use `eventTitle`/`title` (event name vs. feature/story
  // title); plain talks use `title`/`event` — this reads whichever the
  // entry actually has rather than assuming one shape. Any extra keywords
  // (e.g. "Nextria", "NSERC CREATE") live on the talk's own `keywords`
  // field in the data source, never hand-typed a second time here.
  const perTalk = getTalks().map((talk) => {
    const eventLabel = talk.eventTitle ?? talk.event ?? null;
    return {
      id: `talk-${talk.id}`,
      title: talk.title,
      subtitle: eventLabel ? `Talks › ${eventLabel}` : "Talks",
      category: "Talks",
      icon: Mic,
      keywords: [
        talk.title?.toLowerCase(),
        eventLabel?.toLowerCase(),
        "talk",
        "presentation",
        ...(talk.keywords ?? []),
      ].filter(Boolean),
      action: { type: "open-window", windowId: "talks", data: { talkId: talk.id } },
    };
  });

  return [general, ...perTalk];
}

// Mirrors buildTalkEntries/buildPublicationEntries: one general entry, one
// per section (so "movie reviews"/"watched movies"/"movie lists" jump
// straight to the right tab via `data.section`, the same deep-link
// convention Photos already uses), and one per verified film/review, all
// derived from the single Letterboxd data source — nothing here
// hand-duplicates a film or review title a second time.
function buildLetterboxdEntries() {
  // Keywords are deliberately partitioned with no overlap between the
  // general entry and the section-specific ones below. This isn't just
  // about avoiding a duplicate keyword string — the subtitle's own words
  // are also part of the ranking haystack, and a subtitle like "Movie
  // reviews, watched films, and lists" was confirmed (live) to make a
  // two-word query like "movie lists" score *higher* on this general entry
  // than the dedicated Lists entry's exact-keyword match, because both
  // query tokens happened to appear somewhere in that descriptive text.
  // The subtitle below is deliberately blander to avoid that.
  const general = {
    id: "action-letterboxd",
    title: "Letterboxd",
    subtitle: "Letterboxd activity for Harsh Kaushik",
    category: "Letterboxd",
    icon: Film,
    keywords: ["letterboxd", "movies", "movie", "cinema", "movie ratings", "watchlist", "harsh movies", "harsh reviews"],
    action: { type: "open-window", windowId: "letterboxd" },
  };

  const sections = [
    {
      id: "action-letterboxd-overview",
      title: "Letterboxd Profile",
      subtitle: "Letterboxd › Overview",
      section: "overview",
      keywords: ["profile", "letterboxd profile"],
    },
    {
      id: "action-letterboxd-reviews",
      title: "Letterboxd Reviews",
      subtitle: "Letterboxd › Reviews",
      section: "reviews",
      keywords: ["reviews", "film reviews", "my reviews", "movie reviews"],
    },
    {
      id: "action-letterboxd-films",
      title: "Letterboxd Films",
      subtitle: "Letterboxd › Films",
      section: "films",
      keywords: ["films", "film", "watched movies", "movie diary", "film diary"],
    },
    {
      id: "action-letterboxd-lists",
      title: "Letterboxd Lists",
      subtitle: "Letterboxd › Lists",
      section: "lists",
      keywords: ["lists", "movie list", "movie lists", "film lists"],
    },
  ].map((entry) => ({
    ...entry,
    category: "Letterboxd",
    icon: Film,
    action: { type: "open-window", windowId: "letterboxd", data: { section: entry.section } },
  }));

  const perFilm = getLetterboxdFilms().map((film) => ({
    id: `letterboxd-film-${film.id}`,
    title: film.title,
    subtitle: `Letterboxd › Films › ${film.year}`,
    category: "Letterboxd",
    icon: Film,
    keywords: [film.title.toLowerCase(), "film", "movie", String(film.year)],
    action: { type: "open-window", windowId: "letterboxd", data: { section: "films" } },
  }));

  const perReview = getLetterboxdReviews().map((review) => ({
    id: `letterboxd-review-${review.id}`,
    title: review.filmTitle,
    subtitle: `Letterboxd › Reviews › ${review.filmYear}`,
    category: "Letterboxd",
    icon: Film,
    keywords: [review.filmTitle.toLowerCase(), "review", "movie review", String(review.filmYear)],
    action: { type: "open-window", windowId: "letterboxd", data: { section: "reviews" } },
  }));

  return [general, ...sections, ...perFilm, ...perReview];
}

// NexAI's desktop/Finder icon (buildProjectItems, via getDesktopItems)
// already produces a plain "NexAI" entry titled from Finder's own data —
// this adds a richer, keyword-heavy dedicated entry on top of that with
// `priority: -1` so it wins the exact-title tie and surfaces first,
// exactly like buildGitHubEntries' own documented "GitHub" collision below.
// Keywords are drawn directly from the authoritative NEXAI data (evidence
// categories, research areas) rather than hand-typed a second time here.
function buildNexAIEntries() {
  const general = {
    id: "action-nexai",
    title: NEXAI.name,
    subtitle: NEXAI.shortDescription,
    category: "Research",
    icon: ShieldCheck,
    priority: -1,
    keywords: [
      "nexai", "image authenticity", "ai image detection", "synthetic image detection",
      "manipulated image", "trustworthy ai", "forensic image analysis", "image provenance",
      "research project", "image forensics", "deepfake", "ai generated image",
      ...NEXAI.evidenceCategories.map((e) => e.label.toLowerCase()),
      ...NEXAI.researchAreas.map((area) => area.toLowerCase()),
    ],
    action: { type: "open-window", windowId: "nexai" },
  };

  const evidenceMap = {
    id: "action-nexai-evidence-map",
    title: "NexAI Evidence Map",
    subtitle: "NexAI › How the framework reasons about an image",
    category: "Research",
    icon: ShieldCheck,
    keywords: ["evidence map", "decision states", "how nexai works", "reasoning"],
    action: { type: "open-window", windowId: "nexai" },
  };

  return [general, evidenceMap];
}

// The Dock (src/constants/index.js's dockApps) already registers a plain
// "Application" entry for HarshBot via buildApplicationEntries() —
// title "Ask HarshBot", generic keywords. This adds a second, richer
// entry with the specific keyword set Spotlight is meant to support for
// it; `priority: -1` wins the tie against the generic entry the same way
// buildNexAIEntries/buildGitHubEntries already do for their own windows.
function buildHarshBotEntries() {
  return [{
    id: "action-harshbot",
    title: "HarshBot",
    subtitle: "AI guide to Harsh's portfolio",
    category: "HarshBot",
    icon: MessageCircleMore,
    priority: -1,
    keywords: [
      "harshbot", "ask harsh", "ai assistant", "portfolio assistant", "chat", "chatbot",
      "education", "work experience", "research", "nexai", "publications", "talks",
      "projects", "contact harsh", "ask a question",
    ],
    action: { type: "open-window", windowId: "harshbot" },
  }];
}

// Mirrors buildLetterboxdEntries: one general entry plus profile/
// contributions/repositories section entries. The GitHub window is a single
// continuously-scrolling page rather than tabs, so `data.section` scrolls
// the matching heading into view (see src/windows/GitHub.jsx) instead of
// switching panels.
//
// The Contact window already has its own "GitHub" social-link entry
// (`contact-social-1`, an external link straight to the profile URL) with
// title "GitHub" too, so an exact "github" query ties on `exactTitle`
// scoring. `priority: -1` breaks that tie in this entry's favor — the
// in-app GitHub window is the more useful destination for a bare "github"
// search than a same-tab-adjacent external link.
function buildGitHubEntries() {
  const general = {
    id: "action-github",
    title: "GitHub",
    subtitle: "Repositories, contributions, and developer profile",
    category: "GitHub",
    icon: Github,
    priority: -1,
    keywords: [
      "github", "git", "repositories", "repository", "repos", "source code", "code",
      "contributions", "contribution graph", "contribution calendar", "commit graph", "commit activity",
      "github activity", "developer activity", "pull requests", "code review activity",
      "daily commits", "developer profile", "harsh github", GITHUB_PROFILE.username,
      `${GITHUB_PROFILE.username} activity`,
    ],
    action: { type: "open-window", windowId: "github" },
  };

  const sections = [
    {
      id: "action-github-profile",
      title: "GitHub Profile",
      subtitle: "GitHub › Profile",
      section: "profile",
      keywords: ["github profile", "developer profile", "profile"],
    },
    {
      id: "action-github-contributions",
      title: "GitHub Contributions",
      subtitle: "GitHub › Contributions",
      section: "contributions",
      keywords: ["contributions", "contribution graph", "contribution calendar", "commit graph", "commit activity", "daily commits"],
    },
    {
      id: "action-github-activity",
      title: "GitHub Activity Overview",
      subtitle: "GitHub › Activity overview",
      section: "activity",
      keywords: ["activity overview", "pull requests", "issues", "code reviews", "code review activity", "developer activity", "contributed repositories"],
    },
    {
      id: "action-github-repositories",
      title: "GitHub Repositories",
      subtitle: "GitHub › Repositories",
      section: "repositories",
      keywords: ["repositories", "repository", "repos", "source code", "projects on github"],
    },
  ].map((entry) => ({
    ...entry,
    category: "GitHub",
    icon: Github,
    action: { type: "open-window", windowId: "github", data: { section: entry.section } },
  }));

  return [general, ...sections];
}

// Individual repositories aren't known until the GitHub window's data hook
// fetches/generates them at runtime, so they can't be built alongside the
// rest of this (synchronous, load-once) registry. `useGitHubData` calls this
// once real repository data is available; entries are appended in place
// (not reassigned) so any registry reference a caller already holds -
// Spotlight's own `useMemo(() => getSearchRegistry(), [])` included - sees
// the new entries the next time it searches, without needing to remount.
const registeredGitHubRepoIds = new Set();

export function registerGitHubRepositoryEntries(repositories = []) {
  if (!cachedRegistry) getSearchRegistry();
  const fresh = repositories.filter(
    (repo) => repo?.fullName && repo?.htmlUrl && !registeredGitHubRepoIds.has(repo.fullName),
  );
  if (!fresh.length) return;

  fresh.forEach((repo) => registeredGitHubRepoIds.add(repo.fullName));
  const entries = fresh.map((repo) => prepareEntry({
    id: `github-repo-${repo.fullName}`,
    title: repo.name,
    subtitle: repo.description ? `GitHub › ${repo.description}` : `GitHub › ${repo.fullName}`,
    category: "GitHub",
    icon: Github,
    keywords: [
      repo.name.toLowerCase(),
      repo.fullName.toLowerCase(),
      repo.primaryLanguage?.toLowerCase(),
      ...repo.topics.map((topic) => topic.toLowerCase()),
      "repository", "repo",
    ].filter(Boolean),
    action: { type: "open-window", windowId: "github", data: { section: "repositories" } },
  }));

  cachedRegistry.push(...entries);
}

function buildActionEntries() {
  return [
    {
      id: "action-mission-control",
      title: "Mission Control",
      subtitle: "Show all open windows",
      category: "Actions",
      icon: LayoutGrid,
      keywords: ["mission control", "show all windows", "windows overview", "overview", "spaces", "all windows"],
      action: { type: "mission-control" },
    },
    {
      id: "action-show-desktop",
      title: "Show Desktop",
      subtitle: "Minimize every open window",
      category: "Actions",
      icon: Minimize2,
      keywords: ["show desktop", "minimize all", "hide windows", "desktop"],
      action: { type: "show-desktop" },
    },
    {
      id: "action-start-tour",
      title: "Start Portfolio Tour",
      subtitle: "Guided walkthrough with Live Activity progress",
      category: "Actions",
      icon: Compass,
      keywords: ["tour", "guided tour", "start tour", "walkthrough", "portfolio tour", "take a tour"],
      action: { type: "start-tour" },
    },
    {
      id: "action-time-machine",
      title: "Open Time Machine",
      subtitle: "Harsh's professional timeline",
      category: "Actions",
      icon: History,
      keywords: ["time machine", "timeline", "career", "history", "journey"],
      action: { type: "open-time-machine" },
    },
    {
      id: "action-quick-look",
      title: "Quick Look",
      subtitle: "Preview the selected item",
      category: "Actions",
      icon: Eye,
      keywords: ["quick look", "preview", "space"],
      action: { type: "quick-look" },
    },
    {
      id: "action-get-info",
      title: "Get Info",
      subtitle: "Show details for the selected item",
      category: "Actions",
      icon: Info,
      keywords: ["get info", "info", "properties", "details", "cmd i", "ctrl i"],
      action: { type: "get-info" },
    },
    {
      id: "action-control-center",
      title: "Control Center",
      subtitle: "Appearance, Dock, and desktop preferences",
      category: "Actions",
      icon: Palette,
      keywords: ["control center", "preferences", "settings", "appearance", "dark mode", "light mode", "accent color", "wallpaper"],
      action: { type: "open-control-center" },
    },
    {
      id: "action-edit-widgets",
      title: "Edit Widgets",
      subtitle: "Add or remove desktop widgets",
      category: "Actions",
      icon: Pencil,
      keywords: ["widgets", "edit widgets", "desktop widgets", "add widget"],
      action: { type: "edit-widgets" },
    },
    {
      id: "action-activity-monitor",
      title: "Activity Monitor",
      subtitle: "Live diagnostics for this portfolio's own windows and performance",
      category: "Utilities",
      icon: Activity,
      keywords: [
        "activity monitor", "performance", "system performance", "fps", "memory",
        "windows", "diagnostics", "portfolio diagnostics", "cpu", "dom nodes",
      ],
      action: { type: "open-window", windowId: "activityMonitor" },
    },
  ];
}

function buildSettingsEntries() {
  return [
    {
      id: "settings-screen-saver",
      title: "Screen Saver",
      subtitle: "Toggle the screen saver on or off",
      category: "Settings",
      icon: Clock,
      keywords: ["screen saver", "screensaver", "inactivity", "settings"],
      action: { type: "toggle-screen-saver" },
    },
  ];
}

function buildHelpEntries() {
  return HELP_TOPICS.map((topic) => ({
    id: `help-${topic.id}`,
    title: topic.title,
    subtitle: "Help topic",
    category: "Help",
    icon: HelpCircle,
    keywords: ["help", "how to use", "navigation", "instructions", ...(HELP_TOPIC_KEYWORDS[topic.id] ?? [])],
    action: { type: "help-topic", topicId: topic.id },
  }));
}

let cachedRegistry = null;

// The registry is rebuilt once (from data that never changes at runtime)
// and cached — searching per keystroke only re-ranks this fixed list.
export function getSearchRegistry() {
  if (cachedRegistry) return cachedRegistry;

  const rawEntries = [
    ...buildApplicationEntries(),
    ...buildShortcutEntries(),
    ...buildPortfolioItemEntries(),
    ...buildSkillEntries(),
    ...buildPhotoSectionEntries(),
    ...buildActionEntries(),
    ...buildPublicationEntries(),
    ...buildTalkEntries(),
    ...buildNexAIEntries(),
    ...buildHarshBotEntries(),
    ...buildLetterboxdEntries(),
    ...buildGitHubEntries(),
    ...buildSettingsEntries(),
    ...buildHelpEntries(),
  ];

  cachedRegistry = rawEntries.map(prepareEntry);
  return cachedRegistry;
}

import { ABOUT_CONTENT } from "#constants/about.js";
import { NEXAI } from "#constants/nexai.js";
import { GITHUB_PROFILE } from "#constants/github.js";

const navLinks = [
    {
      id: 1,
      name: "Projects",
      type: "finder",
    },
    {
      id: 3,
      name: "Contact",
      type: "contact",
    },
    {
      id: 4,
      name: "Resume",
      type: "resume",
    },
  ];
  
  // The Navbar previously rendered these four (Wi-Fi, a duplicate Search,
  // User, Mode) as plain, non-interactive <img> tags sitting directly next
  // to real controls — they looked clickable but did nothing. Removed;
  // Search/Mission Control/Control Center already cover those real
  // actions, and Mode is now a genuine appearance quick-toggle button in
  // Navbar.jsx (wired to usePreferencesStore) instead of a static icon.
  
  const dockApps = [
    {
      id: "finder",
      name: "Portfolio", // was "Finder"
      icon: "finder.png",
      canOpen: true,
    },
    {
      id: "safari",
      name: "Field Notes", // was "Safari" / "Articles" — see A8: no longer a tutorial-article reader
      icon: "safari.png",
      canOpen: true,
    },
    {
      id: "photos",
      name: "Gallery", // was "Photos"
      icon: "photos.png",
      canOpen: true,
    },
    {
      id: "contact",
      name: "Contact", // or "Get in touch"
      icon: "contact.png",
      canOpen: true,
    },
    {
      id: "terminal",
      name: "Skills", // was "Terminal"
      icon: "terminal.png",
      canOpen: true,
    },
    {
      id: "spotify",
      name: "Spotify",
      icon: "GzawwLrXwAA_j7W.jpg",
      canOpen: true,
    },
    {
      id: "letterboxd",
      name: "Letterboxd",
      icon: "letterboxd.png",
      canOpen: true,
    },
    {
      id: "github",
      name: "GitHub",
      icon: "github.png",
      canOpen: true,
    },
    {
      id: "harshbot",
      name: "Ask HarshBot",
      icon: "harshbot.svg",
      canOpen: true,
    },
    {
      id: "trash",
      name: "Archive", // was "Trash"
      icon: "trash.png",
      canOpen: false,
    },
  ];

  const SPOTIFY_PLAYLIST = {
    id: "2VwQB5vqZyKBYWV8dC2tXJ",
    title: "Harsh's Favorite Playlist",
    description: "A collection of songs I keep coming back to.",
    publicUrl: "https://open.spotify.com/playlist/2VwQB5vqZyKBYWV8dC2tXJ?si=yPdbvkC7SuuPA7vdQQqh7A",
    embedUrl: "https://open.spotify.com/embed/playlist/2VwQB5vqZyKBYWV8dC2tXJ",
    icon: "/images/GzawwLrXwAA_j7W.jpg",
  };
  
  // The three "blog posts" that used to live here were JavaScript Mastery
  // tutorial articles (not Harsh's own writing) presented as a personal
  // blog. Removed entirely — Field Notes (src/windows/Safari.jsx) now
  // renders an honest empty state instead of implying they were his work.

  const techStack = [
    {
      category: "Frontend",
      items: ["React.js", "Next.js", "TypeScript"],
    },
    {
      category: "Mobile",
      items: ["React Native", "Expo"],
    },
    {
      category: "Styling",
      items: ["Tailwind CSS", "Sass", "CSS"],
    },
    {
      category: "Backend",
      items: ["Node.js", "Express", "NestJS", "Hono"],
    },
    {
      category: "Database",
      items: ["MongoDB", "PostgreSQL"],
    },
    {
      category: "Dev Tools",
      items: ["Git", "GitHub", "Docker"],
    },
  ];
  
  // Verified profiles only — this previously pointed at the JavaScript
  // Mastery course template's own GitHub/platform/Twitter/LinkedIn links,
  // not Harsh's. Do not change these two URLs without re-verifying them.
  const socials = [
    {
      id: 1,
      text: "GitHub",
      icon: "/icons/github.svg",
      bg: "#24292e",
      link: GITHUB_PROFILE.profileUrl,
    },
    {
      id: 2,
      text: "LinkedIn",
      icon: "/icons/linkedin.svg",
      bg: "#0a66c2",
      link: "https://www.linkedin.com/in/haarsh01/",
    },
  ];

  // The one verified contact email already configured in the project
  // (previously hardcoded directly inside src/windows/Contact.jsx) —
  // reused everywhere a contact email is needed instead of being
  // duplicated or replaced with an invented address.
  const CONTACT_EMAIL = "hr424144@dal.ca";
  
  const photosLinks = [
    {
      id: 1,
      icon: "/icons/gicon1.svg",
      title: "Library",
    },
    {
      id: 2,
      icon: "/icons/gicon2.svg",
      title: "Memories",
    },
    {
      id: 3,
      icon: "/icons/file.svg",
      title: "Places",
    },
    {
      id: 4,
      icon: "/icons/gicon4.svg",
      title: "People",
    },
    {
      id: 5,
      icon: "/icons/gicon5.svg",
      title: "Favorites",
    },
  ];
  
  // The JS Mastery template-branding tile (formerly gal2.png) has been
  // removed — only verified personal photographs remain here.
  const gallery = [
    {
      id: 1,
      img: "/images/gal1.png",
    },
    {
      id: 2,
      img: "/images/gal3.png",
    },
    {
      id: 3,
      img: "/images/gal4.png",
    },
  ];
  
  export {
    navLinks,
    dockApps,
    techStack,
    socials,
    CONTACT_EMAIL,
    photosLinks,
    gallery,
    SPOTIFY_PLAYLIST,
  };
  
  // Work now surfaces Harsh's real, verified work — the tutorial-template
  // demo projects (a Nike-clone storefront, an AI resume analyzer, a food
  // delivery app) that previously occupied this folder have been removed
  // entirely, including their placeholder `Design.fig -> google.com` links
  // and YouTube-tutorial "live site" links. Both entries below are `kind:
  // "app"` — a direct launch point for a real window (see Finder.jsx's
  // `openItem`), not a folder of unrelated tutorial assets. Each still
  // carries one real `.txt` description as its only child, purely so Get
  // Info/Quick Look/Spotlight have real, verified copy to show.
  const WORK_LOCATION = {
    id: 1,
    type: "work",
    name: "Work",
    icon: "/icons/work.svg",
    kind: "folder",
    children: [
      {
        id: 5,
        name: "NexAI",
        icon: "/images/folder.png",
        kind: "app",
        windowId: "nexai",
        featured: true, // Highlighted project for the guided portfolio tour
        position: "top-10 left-5",
        children: [
          {
            id: 1,
            name: "NexAI.txt",
            icon: "/images/txt.png",
            kind: "file",
            fileType: "txt",
            position: "top-5 left-10",
            description: [NEXAI.shortDescription, ...NEXAI.whyItMatters],
          },
        ],
      },
      {
        id: 6,
        name: "Portfolio OS",
        icon: "/images/folder.png",
        kind: "app",
        windowId: "aboutPortfolio",
        position: "top-52 right-80",
        children: [
          {
            id: 1,
            name: "Portfolio OS.txt",
            icon: "/images/txt.png",
            kind: "file",
            fileType: "txt",
            position: "top-5 right-10",
            description: [
              "This portfolio is itself a real piece of product engineering — a macOS-inspired interface built from scratch, not a template with a theme applied.",
              "It includes centralized window management, a Mission Control that animates real live windows, an accessible weighted-search Spotlight, a Control Center with persisted settings, and a shareable-state Handoff system.",
              "See About This Portfolio for the full breakdown of what's actually running under the hood.",
            ],
          },
        ],
      },
    ],
  };
  
  const ABOUT_LOCATION = {
    id: 2,
    type: "about",
    name: "About me",
    icon: "/icons/info.svg",
    kind: "folder",
    children: [
      {
        id: 1,
        name: "me.png",
        icon: "/images/image.png",
        kind: "file",
        fileType: "img",
        position: "top-10 left-5",
        imageUrl: "/images/adrian.jpg",
      },
      {
        id: 2,
        name: "casual-me.png",
        icon: "/images/image.png",
        kind: "file",
        fileType: "img",
        position: "top-28 right-72",
        imageUrl: "/images/adrian-2.jpg",
      },
      {
        id: 3,
        name: "conference-me.png",
        icon: "/images/image.png",
        kind: "file",
        fileType: "img",
        position: "top-52 left-80",
        imageUrl: "/images/adrian-3.jpeg",
      },
      {
        id: 4,
        name: "about-me.txt",
        icon: "/images/txt.png",
        kind: "file",
        fileType: "txt",
        position: "top-60 left-5",
        image: "/images/adrian.jpg",
        // Quick Look's preview reuses the same verbatim biography as the
        // full editorial page (components/AboutBiography.jsx) — one real
        // source of truth (src/constants/about.js), never a second,
        // independently-drifting bio.
        description: ABOUT_CONTENT.intro,
      },
    ],
  };
  
  const RESUME_LOCATION = {
    id: 3,
    type: "resume",
    name: "Resume",
    icon: "/icons/file.svg",
    kind: "folder",
    children: [
      {
        id: 1,
        name: "Resume.pdf",
        icon: "/images/pdf.png",
        kind: "file",
        fileType: "pdf",
        // you can add `href` if you want to open a hosted resume
        // href: "/your/resume/path.pdf",
      },
    ],
  };
  
  const PUBLICATIONS_LOCATION = {
    id: 8,
    type: "publications",
    name: "Publications",
    icon: "/icons/edit.svg",
    kind: "folder",
    children: [],
  };

  const TALKS_LOCATION = {
    id: 9,
    type: "talks",
    name: "Talks",
    icon: "/icons/wifi.svg",
    kind: "folder",
    children: [],
  };

  // A real, browsable Finder location for utility windows that don't
  // belong in the Dock or on the desktop but still deserve a genuine
  // navigation path beyond Spotlight alone (see searchRegistry.js's
  // "action-activity-monitor" entry for the Spotlight side of this).
  const UTILITIES_LOCATION = {
    id: 10,
    type: "utilities",
    name: "Utilities",
    icon: "/icons/atom.svg",
    kind: "folder",
    children: [
      {
        id: 1,
        name: "Activity Monitor",
        icon: "/images/terminal.png",
        kind: "app",
        windowId: "activityMonitor",
        position: "top-10 left-10",
        children: [],
      },
    ],
  };

  const TRASH_LOCATION = {
    id: 4,
    type: "trash",
    name: "Trash",
    icon: "/icons/trash.svg",
    kind: "folder",
    children: [
      {
        id: 1,
        name: "trash1.png",
        icon: "/images/image.png",
        kind: "file",
        fileType: "img",
        position: "top-10 left-10",
        imageUrl: "/images/trash-1.png",
      },
      {
        id: 2,
        name: "trash2.png",
        icon: "/images/image.png",
        kind: "file",
        fileType: "img",
        position: "top-40 left-80",
        imageUrl: "/images/trash-2.png",
      },
    ],
  };
  
  export const locations = {
    work: WORK_LOCATION,
    about: ABOUT_LOCATION,
    resume: RESUME_LOCATION,
    publications: PUBLICATIONS_LOCATION,
    talks: TALKS_LOCATION,
    utilities: UTILITIES_LOCATION,
    trash: TRASH_LOCATION,
  };
  
  const INITIAL_Z_INDEX = 1000;
  
  const WINDOW_CONFIG = {
    finder: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 640, minHeight: 420 },
    contact: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 420, minHeight: 360 },
    resume: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 380, minHeight: 460 },
    safari: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 600, minHeight: 420 },
    photos: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 560, minHeight: 420 },
    terminal: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 420, minHeight: 360 },
    txtfile: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 340, minHeight: 320 },
    imgfile: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 340, minHeight: 320 },
    spotify: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 460, minHeight: 460 },
    aboutPortfolio: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 520, minHeight: 460 },
    timeMachine: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 640, minHeight: 480 },
    activityMonitor: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 560, minHeight: 480 },
    publications: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 520, minHeight: 480 },
    talks: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 520, minHeight: 480 },
    letterboxd: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 520, minHeight: 460 },
    github: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 540, minHeight: 440 },
    nexai: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 560, minHeight: 480 },
    harshbot: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 420, minHeight: 480 },
  };
  
  export { INITIAL_Z_INDEX, WINDOW_CONFIG };
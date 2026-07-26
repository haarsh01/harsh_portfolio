import { ABOUT_CONTENT } from "#constants/about.js";
import { NEXAI } from "#constants/nexai.js";
import { AUDITLM } from "#constants/auditlm.js";
import { GITHUB_PROFILE } from "#constants/github.js";
import { Image as ImageIcon, Images, Clock, MapPin, Star, History } from "lucide-react";

const navLinks = [
    {
      id: 0,
      name: "Portfolio",
      type: "finder",
    },
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

  // Mirrors the "Skills" section of the current CV (public/files/
  // cv_harsh_kaushik.pdf) verbatim — same four categories, same items,
  // nothing invented and nothing from the old template's stack (Next.js,
  // React Native, NestJS, etc., none of which are real skills) carried
  // over. Update this whenever the CV's own Skills section changes.
  const techStack = [
    {
      category: "Languages",
      items: ["Python", "C/C++", "Java", "JavaScript", "SQL"],
    },
    {
      category: "Machine Learning & Computer Vision",
      items: ["Scikit-learn", "NumPy", "Pandas", "TensorFlow", "PyTorch", "Pillow"],
    },
    {
      category: "Web & Backend",
      items: ["React", "Node.js", "Express.js", "FastAPI", "REST APIs"],
    },
    {
      category: "Databases & Cloud",
      items: ["PostgreSQL", "MySQL", "MongoDB", "AWS (EC2, S3)"],
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
  
  // Drives both the Photos sidebar (Photos.jsx) and Photos' search entries
  // (searchRegistry.js) — every section here is backed by real derived data
  // (src/utils/photoLibrary.js) or an honest empty state, never a fake one.
  const photosLinks = [
    {
      id: 1,
      icon: ImageIcon,
      title: "Library",
    },
    {
      id: 2,
      icon: Images,
      title: "Albums",
    },
    {
      id: 3,
      icon: Clock,
      title: "Memories",
    },
    {
      id: 4,
      icon: MapPin,
      title: "Places",
    },
    {
      id: 5,
      icon: Star,
      title: "Favorites",
    },
    {
      id: 6,
      icon: History,
      title: "Recents",
    },
  ];

  export {
    navLinks,
    dockApps,
    techStack,
    socials,
    CONTACT_EMAIL,
    photosLinks,
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
            // Deliberately neutral — see src/constants/nexai.js. No
            // research/product detail is published anywhere while this
            // project is still under development.
            description: [NEXAI.body, NEXAI.supportingLine],
          },
        ],
      },
      {
        id: 7,
        name: "AuditLM",
        icon: "/images/folder.png",
        kind: "app",
        windowId: "auditlm",
        position: "top-10 left-44",
        children: [
          {
            id: 1,
            name: "AuditLM.txt",
            icon: "/images/txt.png",
            kind: "file",
            fileType: "txt",
            position: "top-5 left-10",
            // Same neutral-placeholder policy as NexAI — see
            // src/constants/auditlm.js. Nothing invented here.
            description: [AUDITLM.body, AUDITLM.supportingLine],
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
        name: "DSCF0390-3.webp",
        icon: "/images/image.png",
        kind: "file",
        fileType: "img",
        position: "top-10 left-5",
        // A real photo — the same file used as about-me.txt's hero image
        // below. Replaced the old "me.png" stand-in that pointed at the
        // template's stock adrian.jpg placeholder. The "casual-me.png"/
        // "conference-me.png" stand-ins that used to sit alongside this
        // (pointing at the template's other stock adrian-2.jpg/adrian-3.jpeg
        // placeholders) were removed outright rather than replaced —
        // there was no second/third real photo to put in their place.
        imageUrl: "/images/about/DSCF0390-3.webp",
      },
      {
        id: 4,
        name: "about-me.txt",
        icon: "/images/txt.png",
        kind: "file",
        fileType: "txt",
        position: "top-60 left-5",
        image: "/images/about/DSCF0390-3.webp",
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

  // Note: Activity Monitor used to also be reachable via a Finder
  // "Utilities" location — removed (see the Dock/Finder cleanup this
  // comment survived from) since it's a genuine, still-reachable feature
  // via Spotlight (searchRegistry.js's "action-activity-monitor" entry)
  // and the About This Portfolio tour button, neither of which depended on
  // this Finder folder existing.

  export const locations = {
    work: WORK_LOCATION,
    about: ABOUT_LOCATION,
    resume: RESUME_LOCATION,
    publications: PUBLICATIONS_LOCATION,
    talks: TALKS_LOCATION,
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
    nexai: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 380, minHeight: 320 },
    auditlm: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 380, minHeight: 320 },
    harshbot: { isOpen: false, isMinimized: false, isMaximized: false, zIndex: INITIAL_Z_INDEX, data: null, resizable: true, minWidth: 420, minHeight: 480 },
  };
  
  export { INITIAL_Z_INDEX, WINDOW_CONFIG };
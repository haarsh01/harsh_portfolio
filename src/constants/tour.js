// Guided Portfolio Tour configuration. Every step points at a window/action
// that already exists — nothing here invents a destination. Reordered so
// NexAI (the flagship research project) surfaces immediately after a quick
// navigation intro, ahead of research credibility (Publications, Talks),
// personal story (About), engineering proof (GitHub), and Contact — a
// short, deliberately non-exhaustive progression rather than a long
// onboarding flow. Terminal/Safari/Photos remain fully reachable via the
// Dock, Finder, and Spotlight; they're just no longer forced into the
// guided tour's step count.
import { locations } from "#constants/index.js";

const featuredProject = locations.work.children.find((project) => project.featured)
  ?? locations.work.children[0]
  ?? null;

// A `kind: "app"` Work entry (NexAI, Portfolio OS) is a direct launch point
// for a real window — open that window itself on the tour's featured step
// rather than navigating Finder into its (single-file) folder.
const featuredProjectAction = featuredProject
  ? (featuredProject.kind === "app" && featuredProject.windowId
    ? { type: "open-window", windowId: featuredProject.windowId }
    : { type: "open-finder-location", location: featuredProject })
  : null;

const rawSteps = [
  {
    id: "welcome",
    title: "Explore the Desktop",
    icon: "/images/finder.png",
    explanation: "Harsh's work, organized the way he actually thinks about it — starting with the Work folder.",
    action: { type: "open-finder-location", location: locations.work },
  },
  featuredProject ? {
    id: "featured-project",
    title: featuredProject.name,
    icon: "/images/folder.png",
    explanation: `A closer look at ${featuredProject.name}, Harsh's featured research project.`,
    action: featuredProjectAction,
  } : null,
  {
    id: "publications",
    title: "Publications",
    icon: "/images/pdf.png",
    explanation: "Peer-reviewed research, verified and cited.",
    action: { type: "open-window", windowId: "publications" },
  },
  {
    id: "talks",
    title: "Talks",
    icon: "/images/terminal.png",
    explanation: "Presenting research to an industry audience.",
    action: { type: "open-window", windowId: "talks" },
  },
  {
    id: "about",
    title: "About Harsh",
    icon: "/images/txt.png",
    explanation: "Who he is beyond the research — in his own words.",
    action: { type: "open-window", windowId: "txtfile", data: locations.about.children.find((child) => child.fileType === "txt") ?? null },
  },
  {
    id: "github",
    title: "GitHub",
    icon: "/images/github.png",
    explanation: "Real repositories and contribution activity.",
    action: { type: "open-window", windowId: "github" },
  },
  {
    id: "contact",
    title: "Contact",
    icon: "/images/contact.png",
    explanation: "Ready to connect? Here's how to reach Harsh.",
    action: { type: "open-window", windowId: "contact" },
  },
];

// Filters out the featured-project step only in the (currently untrue, but
// handled) case that no project is marked/available — never a fabricated
// stand-in step.
export const TOUR_STEPS = rawSteps.filter(Boolean);

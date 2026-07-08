// Single authoritative source for the About page biography. The wording
// here is used verbatim by the About editorial layout (components/
// AboutBiography.jsx) — nothing rewrites, shortens, or invents any of it.
export const ABOUT_CONTENT = {
  name: "Harsh Kaushik",
  eyebrow: "About Me",
  intro: [
    "I’m Harsh Kaushik, a computer science researcher and engineer at Dalhousie University. My work lives at the intersection of trustworthy artificial intelligence, cybersecurity, machine learning, and product engineering.",
    "My current research has grown into NexAI—an evidence-driven framework for investigating whether an image is human-captured, AI-generated, or manipulated. Instead of depending on a single model prediction, I explore how visual patterns, forensic traces, metadata, provenance, transformation behaviour, and calibrated uncertainty can work together to produce decisions people can understand.",
    "Beyond image authenticity, I’m interested in intelligent systems that have to earn the user’s trust: machine-learning pipelines, multi-agent architectures, secure backends, distributed systems, and interfaces that turn complicated research into useful products. I enjoy the entire journey—from asking the research question and designing the experiment to engineering the system that eventually reaches someone’s screen.",
  ],
  outsideScreen: {
    title: "Outside the screen",
    paragraphs: [
      "I photograph skies, streets, and ordinary moments that deserve a second look. I spend longer in bookstores than planned, prefer physical books, write poetry and journal entries, collect postcards, coffee mugs, and vinyl records, run on weekends, and maintain an optimistic relationship with tennis.",
    ],
    transition: "These interests are not separate from my technical work.",
  },
  principles: [
    { label: "Photography", text: "made me care about the truth carried by images." },
    { label: "Poetry", text: "taught me that precision can still contain feeling." },
    { label: "Running", text: "taught me that difficult systems are built one patient mile at a time." },
  ],
  vision: "I’m building toward a future where intelligent systems are not merely impressive, but thoughtful, secure, understandable, and careful enough to be trusted.",
  details: [
    { label: "Based in", value: "Halifax, Canada." },
    { label: "Often found", value: "Researching, building, photographing, writing, reading, or running." },
  ],
  // A short, Contact-window-sized restatement of the same facts above
  // (role, institution, location) — kept here so Contact.jsx imports one
  // sentence from this single authoritative source instead of maintaining
  // its own independently-drifting paraphrase.
  contactIntroduction: "Computer science researcher and engineer at Dalhousie University, based in Halifax, Canada.",
};

// Phrases given careful, restrained emphasis in the rendered prose — kept
// as data here (not baked into ABOUT_CONTENT's own strings) so the
// biography text above stays exactly what was supplied.
export const ABOUT_EMPHASIS_PHRASES = [
  "NexAI",
  "trustworthy artificial intelligence",
  "earn the user’s trust",
  "thoughtful, secure, understandable",
];

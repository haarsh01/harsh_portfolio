// Single authoritative source for the About page biography. The wording
// here is used verbatim by the About editorial layout (components/
// AboutBiography.jsx) — nothing rewrites, shortens, or invents any of it.
export const ABOUT_CONTENT = {
  name: "Harsh Kaushik",
  // The About page's own top title (components/AboutBiography.jsx) —
  // replaced the old two-line "About Me" eyebrow + "Harsh Kaushik" name
  // heading with this single, lowercase, reader-friendly line. Kept
  // separate from `name` above, which is still real data used elsewhere
  // (Contact.jsx's own heading) and must keep its normal capitalization.
  pageTitle: "what i build & how i think ?",
  intro: [
    "I’m Harsh Kaushik, a computer science researcher and engineer at Dalhousie University. My work lives at the intersection of trustworthy artificial intelligence, cybersecurity, machine learning, and product engineering.",
    "I recently completed my Master of Computer Science at Dalhousie, where I focused on applied artificial intelligence, computer vision, and trustworthy machine learning. My background brings together research and practical software development — I enjoy understanding complex technical problems, experimenting with different approaches, and turning promising ideas into systems that hold up in the real world.",
    "During my master’s, I worked on an AI-based image authenticity framework that explored how semantic and forensic evidence can help identify AI-generated and manipulated visual content. Through that work I gained hands-on experience across computer vision, model evaluation, explainability, data pipelines, backend development, and research-driven product development.",
    "Before starting my master’s, I worked as a Mitacs research intern at Dalhousie, applying machine learning to intrusion detection in IoT and network environments — an experience that strengthened my foundation in cybersecurity, data analysis, and experimental research. I’ve also worked as a teaching assistant and marker for courses in data structures, algorithms, and advanced network security, which taught me how to explain technical ideas clearly and work with people from different backgrounds.",
    "My technical experience spans Python, PyTorch, Hugging Face, scikit-learn, pandas, SQL, FastAPI, Docker, Git, and REST APIs. What I enjoy most is working at the intersection of research and engineering — building thoughtful solutions, learning from real-world limitations, and collaborating with others to turn technical ideas into meaningful outcomes. I’m particularly interested in developing AI systems that are reliable, explainable, scalable, and genuinely useful.",
  ],
  // A card-based restructuring of `intro[1..4]` above for the Research
  // section (components/AboutBiography.jsx) — same facts, no invented
  // detail, just organized into short skimmable blocks instead of one
  // paragraph wall. `intro` itself is untouched and stays the source for
  // the hero lead paragraph and about-me.txt's Quick Look preview, so nothing
  // here is a second, independently-drifting bio — it's the same content,
  // reshaped for the one surface where a full read-through matters most.
  research: {
    intro: "I recently completed my Master of Computer Science at Dalhousie University, where my work focused on applied AI, computer vision, and trustworthy machine learning.",
    cards: [
      {
        label: "Thesis research",
        text: "I explored image authenticity through semantic and forensic evidence — reasoning about AI-generated and manipulated visual content, not just detecting it.",
      },
      {
        label: "Research-to-system thinking",
        text: "Model evaluation, explainability, data pipelines, and backend development — using tools like Python, PyTorch, and FastAPI to turn research questions into systems that hold up in the real world.",
      },
      {
        label: "Cybersecurity foundation",
        text: "Before my master’s, I worked as a Mitacs research intern, applying machine learning to intrusion detection in IoT and network environments.",
      },
      {
        label: "Teaching and communication",
        text: "I supported courses in data structures, algorithms, and advanced network security — experience that taught me to explain technical ideas clearly to people from different backgrounds.",
      },
      {
        label: "What I care about",
        text: "Building AI systems that are reliable, explainable, scalable, and genuinely useful in real-world settings.",
      },
    ],
  },
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
};

// Phrases given careful, restrained emphasis in the rendered prose — kept
// as data here (not baked into ABOUT_CONTENT's own strings) so the
// biography text above stays exactly what was supplied.
export const ABOUT_EMPHASIS_PHRASES = [
  "trustworthy artificial intelligence",
  "reliable, explainable, scalable, and genuinely useful",
  "thoughtful, secure, understandable",
];

// Logo strip for the About page's "Organizations I Worked With" section
// (components/AboutBiography.jsx). Just the four real, verified
// organizations already named elsewhere on the site (About's own intro
// mentions Dalhousie and Mitacs; the résumé/CV lists NSERC and Nextria) —
// nothing invented, no project-specific detail attached to any of them.
// `file` is the filename inside public/images/organizations/ only; the
// base-aware URL is built where it's rendered. The Dalhousie asset's
// original filename ("DAL_FullColorOfficial_Logo final.png") contains a
// space, so it was copied under this safe name for reliable use here —
// the original, unmodified file still exists alongside it in that same
// folder.
export const ABOUT_ORGANIZATIONS = {
  title: "Organizations I Worked With",
  subtitle: "Research, academic, funding, and industry environments that shaped my work.",
  logos: [
    { name: "Mitacs", alt: "Mitacs logo", file: "Mitacs.png" },
    { name: "Dalhousie University", alt: "Dalhousie University logo", file: "dalhousie-university.png" },
    { name: "NSERC", alt: "NSERC logo", file: "4535-natural-sciences-and-engineering-research-council-canada-nserc.png" },
    { name: "Nextria", alt: "Nextria logo", file: "Nextria-Web.png" },
  ],
};

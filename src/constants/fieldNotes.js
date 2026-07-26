// Single authoritative content source for Field Notes (src/windows/Safari.jsx,
// windowId "safari"). One verified, first-person post about the master's
// thesis journey — deliberately high-level: it explains the scientific idea
// (image authenticity, computer vision, semantic/forensic evidence,
// trustworthy ML) without naming the underlying project, its architecture,
// or any private metric. See the no-fabrication note on `readingTime` below.
//
// Images are real photos (converted/optimized to .webp — see
// image-originals/ locally, gitignored, for the untouched camera
// originals) stored under public/images/field-notes/thesis/. `file` is
// just the filename; Safari.jsx builds the base-aware URL. IMG_1712 (the
// actual thesis-defence-day workspace, laptop + title slide) is the hero.
// The two inline photos sit inside the section each one actually
// supports: the research-desk photo (DSC03642, NSERC/Nextria visible on
// screen in the background) now falls inside "Not built alone" as that
// section's own supporting image, rather than trailing the previous
// section — and the campus photo (DSC03891) closes out "What I carry
// forward" as a reflective, journey-ending image rather than sitting
// mid-article. Neither image's own alt text calls out the visible logos
// or any project detail; that stays generic on purpose. Images carry no
// `caption` field — FieldNoteImage (Safari.jsx) only renders a
// <figcaption> when one is actually present, so this is simply omitted
// rather than set empty.
export const FIELD_NOTES = [
  {
    id: "learning-to-trust-what-we-see",
    title: "Learning to Trust What We See",
    subtitle: "A field note on image authenticity, computer vision, and the research journey behind my master’s thesis.",
    date: "July 2026",
    // Computed from the article's real word count (~700 words) at a
    // standard ~200wpm estimate, rounded up — not a placeholder.
    readingTime: "4 min read",
    tags: ["Master’s Thesis", "Computer Vision", "Trustworthy AI", "Research Journey"],
    excerpt: "At first, the question sounded simple: can a machine help us understand whether an image is human-captured, AI-generated, or manipulated? It did not stay simple for very long.",
    hero: {
      file: "IMG_1712.webp",
      alt: "Laptop and monitor set up for Harsh's master's thesis defence at Dalhousie University.",
      width: 1600,
      height: 1200,
    },
    sections: [
      { type: "paragraph", text: "At first, the question sounded simple: can a machine help us understand whether an image is human-captured, AI-generated, or manipulated?" },
      { type: "paragraph", text: "It did not stay simple for very long." },
      { type: "paragraph", text: "During my Master of Computer Science at Dalhousie University, I spent much of my research time thinking about image authenticity. We live in a moment where visual content moves faster than our ability to verify it. A photo can inform, persuade, mislead, or quietly change the way people understand an event. With generative AI becoming more capable, the question is no longer only whether an image looks real. The harder question is what kind of evidence can help us reason about trust." },
      { type: "paragraph", text: "That question became the center of my thesis." },
      { type: "heading", text: "Where the question lived" },
      { type: "paragraph", text: "The work sat somewhere between computer vision, trustworthy machine learning, and applied cybersecurity. I explored how different forms of evidence could support image authenticity analysis. Some evidence came from what an image appears to show at a semantic level. Some came from lower-level visual and forensic patterns. Some came from how a system behaves when an image is transformed, compared, or evaluated under different conditions." },
      { type: "paragraph", text: "I learned quickly that there is no single magic signal." },
      { type: "heading", text: "What the process taught me" },
      { type: "paragraph", text: "A strong-looking model can still fail in uncomfortable ways. A confident prediction is not always a trustworthy one. A result that looks good on one dataset may become much weaker when the data changes. That was one of the most important lessons of the thesis: the goal was not only to build something that performs well, but to understand when and why it works, where it fails, and how those limitations should be communicated." },
      { type: "paragraph", text: "A large part of the work was not glamorous. It involved preparing data, checking labels, running experiments, reading papers, debugging pipelines, comparing outputs, writing scripts, rebuilding parts that were not good enough, and accepting that some ideas had to be changed completely. Research often looks clean in the final paper. The actual journey is much messier." },
      { type: "paragraph", text: "That messiness taught me a lot." },
      { type: "paragraph", text: "It taught me that evaluation is not just a final step. It is part of the thinking process. It taught me that explainability is not only about making a result look nice on a screen. It is about helping a person understand what the system is using as evidence. It taught me that uncertainty should not be treated as a weakness. In many real-world settings, being honest about uncertainty is one of the most responsible things a system can do." },
      { type: "heading", text: "Not built alone" },
      { type: "paragraph", text: "This work was not built alone. The research began as an internship with Nextria, who also served as the industry partner throughout the project. It was also supported through the NSERC CREATE Cybersecurity program, which helped shape the broader research environment around the work." },
      { type: "paragraph", text: "I was fortunate to also learn from my supervisor, mentors, committee members, and the wider lab environment, who challenged the work from different angles. Some conversations were about research framing. Some were about engineering decisions. Others were about what would make the work useful beyond a controlled academic setup. Those discussions helped me see the thesis not only as a research milestone, but as a bridge between academic inquiry and practical software development." },
      { type: "paragraph", text: "That bridge is where I found myself most interested." },
      {
        type: "image",
        file: "DSC03642-Edit.webp",
        alt: "Harsh working at his research desk, surrounded by notes and books.",
        width: 1600,
        height: 1067,
      },
      { type: "heading", text: "What I carry forward" },
      { type: "paragraph", text: "I enjoy the early research questions, the experiments, the uncertainty, and the reading. But I also enjoy turning ideas into systems: building APIs, organizing data pipelines, thinking about user experience, testing edge cases, and making the work understandable to people who may not care about the model details but do care about the outcome." },
      { type: "paragraph", text: "By the end of the thesis, I had a deeper respect for the phrase “trustworthy AI.” It is easy to use those words. It is harder to build systems that deserve them." },
      { type: "paragraph", text: "For me, trustworthy AI means more than accuracy. It means careful evaluation, clear limitations, thoughtful design, and the humility to say when a system is unsure. It means building tools that support human judgment rather than pretending to replace it." },
      { type: "paragraph", text: "Completing the thesis was a major academic milestone, but it also changed how I think as an engineer. I now look at AI systems with a different kind of patience. I ask what evidence they rely on, how they fail, who they are built for, and whether their confidence is actually earned." },
      { type: "paragraph", text: "That is the part of the journey I want to carry forward: building systems that are not only intelligent, but careful, explainable, and genuinely useful." },
      {
        type: "image",
        file: "DSC03891-Edit.webp",
        alt: "Harsh standing outside the Goldberg Computer Science Building at Dalhousie University.",
        width: 1600,
        height: 1067,
      },
      { type: "signature", text: "Thank you,", name: "Harsh" },
    ],
  },
];

export function getFieldNotes() {
  return FIELD_NOTES;
}

export function getFieldNoteById(id) {
  return FIELD_NOTES.find((note) => note.id === id) ?? null;
}

#!/usr/bin/env node
// Builds server/data/harshbot-knowledge.json — the retrieval corpus
// HarshBot answers from. Every chunk's `text` is either quoted directly
// from an existing authoritative content module (src/constants/*.js,
// already used by the real About/NexAI/Publications/Talks/GitHub/
// Letterboxd windows) or a restrained, honest restatement of that same
// verified content — nothing here is invented, and nothing here
// duplicates a biography that could drift out of sync with the real
// pages, since it's generated from those same modules every time this
// script runs.
//
// Deliberately offline and deterministic: no network access, no OpenAI
// call, no token required. Safe to run on every `npm run build` (see
// package.json) — a structurally invalid corpus fails the build; a
// missing OPENAI_API_KEY does not (that's checked at request time, in
// api/harshbot.js, not at build time).
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ABOUT_CONTENT } from '../src/constants/about.js';
import { NEXAI } from '../src/constants/nexai.js';
import { PUBLICATIONS } from '../src/constants/publications.js';
import { TALKS } from '../src/constants/talks.js';
import { GITHUB_PROFILE } from '../src/constants/github.js';
import { LETTERBOXD_PROFILE, LETTERBOXD_FILMS } from '../src/constants/letterboxd.js';
import {
  techStack, socials, CONTACT_EMAIL, SPOTIFY_PLAYLIST,
} from '../src/constants/index.js';
import { validateHarshBotAction } from '../server/lib/harshbotActions.js';

const SCHEMA_VERSION = 1;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(SCRIPT_DIR, '../server/data/harshbot-knowledge.json');
const TODAY = new Date().toISOString().slice(0, 10);

const linkedinUrl = socials.find((s) => s.text === 'LinkedIn')?.link ?? null;

// ---------- Chunk authoring ----------
// `priority` is only a tie-breaker (higher wins) when the deterministic
// retrieval score in server/lib/retrieveHarshKnowledge.js ends in a near
// tie between chunks — it never overrides an actual relevance difference.

const chunks = [
  {
    id: 'overview-role',
    category: 'overview',
    title: 'Who Harsh Kaushik is',
    text: `Harsh Kaushik is a computer science researcher and engineer at Dalhousie University. His work sits at the intersection of trustworthy artificial intelligence, cybersecurity, machine learning, and product engineering. He is based in ${ABOUT_CONTENT.details.find((d) => d.label === 'Based in')?.value ?? 'Halifax, Canada'}`,
    keywords: ['who is harsh', 'harsh kaushik', 'overview', 'introduction', 'about harsh', 'what does harsh do', 'role', 'engineer', 'researcher'],
    aliases: ['Who is Harsh?', 'What does Harsh work on?', 'Tell me about Harsh.'],
    priority: 100,
    lastVerified: TODAY,
    source: { label: 'About Me', action: { type: 'open-destination', destination: { app: 'finder', location: 'about', item: 'about-me-txt' } } },
  },
  {
    id: 'research-interests',
    category: 'research-interests',
    // Restated in the third person from About Me's own first-person
    // paragraph (ABOUT_CONTENT.intro[2]) — same facts, no invention, but
    // never fed to the model as unattributed first-person text, which
    // risks the model echoing "I" instead of "Harsh" in its answer.
    title: "Harsh's research interests",
    text: "Beyond image authenticity, Harsh is interested in intelligent systems that have to earn the user's trust: machine-learning pipelines, multi-agent architectures, secure backends, distributed systems, and interfaces that turn complicated research into useful products. He enjoys the entire journey — from asking the research question and designing the experiment to engineering the system that eventually reaches someone's screen.",
    keywords: ['research interests', 'interests', 'what does he research', 'machine learning', 'distributed systems', 'multi-agent', 'secure backends', 'product engineering'],
    aliases: ['What is Harsh interested in researching?', 'What kind of systems does he build?'],
    priority: 90,
    lastVerified: TODAY,
    source: { label: 'About Me', action: { type: 'open-destination', destination: { app: 'finder', location: 'about', item: 'about-me-txt' } } },
  },
  {
    id: 'nexai-overview',
    category: 'nexai',
    title: 'What NexAI is',
    text: `NexAI is Harsh's flagship research project: ${NEXAI.shortDescription} The research question driving it is: "${NEXAI.researchQuestion}" ${NEXAI.status}`,
    keywords: ['nexai', 'image authenticity', 'ai generated images', 'deepfake', 'image forensics', 'is this image real', 'trustworthy ai project'],
    aliases: ['What is NexAI?', 'What does Harsh do with AI images?', 'Tell me about his image authenticity research.'],
    priority: 100,
    lastVerified: TODAY,
    source: { label: 'NexAI', action: { type: 'open-window', windowId: 'nexai' } },
  },
  {
    id: 'nexai-evidence',
    category: 'nexai',
    title: 'How NexAI reasons about evidence',
    text: `NexAI evaluates an image using several categories of evidence: ${NEXAI.evidenceCategories.map((e) => `${e.label} (${e.description})`).join('; ')}. Based on that evidence, it reaches one of these decision states: ${NEXAI.decisionStates.map((d) => d.label).join(', ')}. ${NEXAI.confidentialityNote}`,
    keywords: ['nexai evidence', 'how nexai works', 'decision states', 'forensic traces', 'metadata', 'provenance', 'calibrated uncertainty'],
    aliases: ['How does NexAI decide if an image is fake?', 'What evidence does NexAI look at?'],
    priority: 80,
    lastVerified: TODAY,
    source: { label: 'NexAI', action: { type: 'open-window', windowId: 'nexai' } },
  },
  {
    id: 'education',
    category: 'education',
    title: "Harsh's education",
    text: 'Harsh is a computer science researcher and engineer at Dalhousie University. The portfolio does not publish a specific degree name or enrollment dates — his full, structured education history is available in his downloadable résumé.',
    keywords: ['education', 'degree', 'university', 'dalhousie', 'school', 'academic background', 'where did he study'],
    aliases: ['Where did Harsh study?', "What is Harsh's education?", "What degree does Harsh have?"],
    priority: 100,
    lastVerified: TODAY,
    source: { label: 'Résumé', action: { type: 'open-window', windowId: 'resume' } },
  },
  {
    id: 'work-research-experience',
    category: 'work-research-experience',
    title: 'Work and research experience',
    text: "Harsh conducts research at Dalhousie University. His current research (NexAI) is developed in collaboration with Nextria Inc. through Dalhousie University's NSERC CREATE Cybersecurity Program. Full, structured work history is available in his downloadable résumé.",
    keywords: ['work experience', 'research experience', 'job', 'employer', 'nextria', 'nserc create', 'career', 'internship'],
    aliases: ['What is his work experience?', 'Where has Harsh worked?', 'Who does he do research with?'],
    priority: 100,
    lastVerified: TODAY,
    source: { label: 'Résumé', action: { type: 'open-window', windowId: 'resume' } },
  },
  {
    id: 'resume-location',
    category: 'work-research-experience',
    title: "Harsh's résumé",
    text: "Harsh's résumé is available directly in this portfolio as a downloadable PDF, with his full structured work history and education details.",
    keywords: ['resume', 'résumé', 'cv', 'curriculum vitae', 'download resume', 'find his resume'],
    aliases: ['Where can I find his résumé?', 'Do you have his resume?', 'Can I download his CV?'],
    priority: 100,
    lastVerified: TODAY,
    source: { label: 'Résumé', action: { type: 'open-window', windowId: 'resume' } },
  },
  {
    id: 'technical-skills',
    category: 'technical-skills',
    title: "Harsh's technical skills",
    text: techStack.map((group) => `${group.category}: ${group.items.join(', ')}`).join('. '),
    keywords: ['technologies', 'tech stack', 'skills', 'programming languages', 'frameworks', 'tools', 'what does he use'],
    aliases: ['What technologies does Harsh use?', 'What is his tech stack?', 'What programming languages does he know?'],
    priority: 90,
    lastVerified: TODAY,
    source: { label: 'Skills', action: { type: 'open-window', windowId: 'terminal' } },
  },
  {
    id: 'projects-overview',
    category: 'projects',
    title: "Harsh's featured projects",
    text: 'The two projects Harsh features are NexAI, his image-authenticity research framework, and this portfolio itself — a macOS-inspired interface built from scratch, not a template with a theme applied, with its own window manager, Mission Control, Spotlight search, and Control Center. His full list of public repositories is on GitHub.',
    keywords: ['projects', 'what has he built', 'featured projects', 'portfolio project', 'built from scratch'],
    aliases: ['What projects has Harsh built?', 'What has he made?'],
    priority: 90,
    lastVerified: TODAY,
    source: { label: 'About This Portfolio', action: { type: 'open-window', windowId: 'aboutPortfolio' } },
  },
  {
    id: 'portfolio-engineering',
    category: 'portfolio-engineering',
    title: "How this portfolio itself is engineered",
    text: 'This portfolio is a portfolio interface inspired by desktop operating systems, not a real one. It is built around one shared window manager (every app opens, closes, focuses, drags, resizes, minimizes, and maximizes through the same lifecycle), a Mission Control that shows a live overview of open windows, Control Center preferences that persist appearance and wallpaper choices, Handoff shareable links that restore the exact window and section being shared, an accessible keyboard-driven Spotlight search, a dynamic time-of-day wallpaper, and a responsive architecture where the same window registry powers both the desktop shell and the mobile app grid.',
    keywords: ['portfolio engineering', 'how is this site built', 'window manager', 'mission control', 'spotlight', 'control center', 'handoff', 'macos portfolio'],
    aliases: ['How is this portfolio built?', 'What is this website made with?', 'Is this a real operating system?'],
    priority: 70,
    lastVerified: TODAY,
    source: { label: 'About This Portfolio', action: { type: 'open-window', windowId: 'aboutPortfolio' } },
  },
  {
    id: 'github-profile',
    category: 'github',
    title: "Harsh's GitHub",
    text: `Harsh's GitHub profile is @${GITHUB_PROFILE.username} (${GITHUB_PROFILE.profileUrl}), which lists his public repositories and contribution activity.`,
    keywords: ['github', 'github profile', 'repositories', 'open source', 'code', 'source code'],
    aliases: ['What is his GitHub?', 'Where can I see his code?', 'Does Harsh have public repositories?'],
    priority: 90,
    lastVerified: TODAY,
    source: { label: 'GitHub', action: { type: 'open-window', windowId: 'github' } },
  },
  {
    id: 'contact',
    category: 'contact',
    title: 'How to contact Harsh',
    text: `Harsh can be reached by email at ${CONTACT_EMAIL}, or found on GitHub (@${GITHUB_PROFILE.username}) and LinkedIn.`,
    keywords: ['contact', 'email', 'reach him', 'get in touch', 'linkedin'],
    aliases: ['How can I contact him?', "What is Harsh's email?", 'Does he have LinkedIn?'],
    priority: 100,
    lastVerified: TODAY,
    source: { label: 'Contact', action: { type: 'open-window', windowId: 'contact' } },
  },
  {
    id: 'linkedin',
    category: 'contact',
    title: "Harsh's LinkedIn",
    text: `Harsh's LinkedIn profile is linked from the Contact section of this portfolio${linkedinUrl ? ` (${linkedinUrl})` : ''}.`,
    keywords: ['linkedin', 'professional profile', 'connect on linkedin'],
    aliases: ["What is Harsh's LinkedIn?", 'Can I connect with him on LinkedIn?'],
    priority: 70,
    lastVerified: TODAY,
    source: { label: 'LinkedIn', action: linkedinUrl ? { type: 'external-link', url: linkedinUrl } : { type: 'open-window', windowId: 'contact' } },
  },
  {
    id: 'location',
    category: 'location',
    title: 'Where Harsh is based',
    text: `Harsh is based in ${ABOUT_CONTENT.details.find((d) => d.label === 'Based in')?.value ?? 'Halifax, Canada'}`,
    keywords: ['location', 'where is he based', 'city', 'halifax', 'canada'],
    aliases: ['Where is Harsh based?', 'What city does he live in?'],
    priority: 90,
    lastVerified: TODAY,
    source: { label: 'About Me', action: { type: 'open-destination', destination: { app: 'finder', location: 'about', item: 'about-me-txt' } } },
  },
  {
    id: 'outside-interests-overview',
    category: 'overview',
    title: "What Harsh enjoys outside technology",
    text: `${ABOUT_CONTENT.outsideScreen.title}: Harsh photographs skies, streets, and ordinary moments; spends longer in bookstores than planned and prefers physical books; writes poetry and journal entries; collects postcards, coffee mugs, and vinyl records; runs on weekends; and maintains an optimistic relationship with tennis. ${ABOUT_CONTENT.outsideScreen.transition}`,
    keywords: ['hobbies', 'interests', 'outside work', 'outside technology', 'spare time', 'free time', 'personal interests', 'what does he enjoy', 'life outside coding'],
    aliases: ['What does Harsh enjoy outside technology?', 'What are his hobbies?', 'What does he do for fun?'],
    priority: 90,
    lastVerified: TODAY,
    source: { label: 'About Me', action: { type: 'open-destination', destination: { app: 'finder', location: 'about', item: 'about-me-txt' } } },
  },
  {
    id: 'photography',
    category: 'photography',
    // Restated in the third person from the same source paragraph as
    // books-reading/writing-poetry/running below (About Me's
    // outsideScreen.paragraphs[0], written in first person) — each chunk
    // here draws out only its own topic rather than repeating the whole
    // paragraph four times.
    title: 'Photography',
    text: 'Harsh photographs skies, streets, and ordinary moments that deserve a second look.',
    keywords: ['photography', 'photos', 'photographer', 'pictures', 'camera'],
    aliases: ['Does Harsh take photos?', 'Is he a photographer?'],
    priority: 60,
    lastVerified: TODAY,
    source: { label: 'Photos', action: { type: 'open-window', windowId: 'photos', data: { section: 'library' } } },
  },
  {
    id: 'books-reading',
    category: 'books-reading',
    title: 'Reading',
    text: 'Harsh spends longer in bookstores than planned and prefers physical books.',
    keywords: ['reading', 'books', 'bookstores', 'what does he read'],
    aliases: ['Does Harsh read?', 'What does he read?'],
    priority: 50,
    lastVerified: TODAY,
    source: { label: 'About Me', action: { type: 'open-destination', destination: { app: 'finder', location: 'about', item: 'about-me-txt' } } },
  },
  {
    id: 'writing-poetry',
    category: 'writing-poetry',
    title: 'Writing',
    text: `Harsh writes poetry and journal entries. As he puts it: "${ABOUT_CONTENT.principles.find((p) => p.label === 'Poetry')?.text ?? ''}"`,
    keywords: ['writing', 'poetry', 'journaling', 'does he write'],
    aliases: ['Does Harsh write?', 'Does he write poetry?'],
    priority: 50,
    lastVerified: TODAY,
    source: { label: 'About Me', action: { type: 'open-destination', destination: { app: 'finder', location: 'about', item: 'about-me-txt' } } },
  },
  {
    id: 'running',
    category: 'running',
    title: 'Running',
    text: `Harsh runs on weekends. As he puts it: "${ABOUT_CONTENT.principles.find((p) => p.label === 'Running')?.text ?? ''}"`,
    keywords: ['running', 'runner', 'exercise', 'fitness'],
    aliases: ['Does Harsh run?', 'Is he a runner?'],
    priority: 50,
    lastVerified: TODAY,
    source: { label: 'About Me', action: { type: 'open-destination', destination: { app: 'finder', location: 'about', item: 'about-me-txt' } } },
  },
  {
    id: 'film-interests',
    category: 'film-interests',
    title: 'Film',
    text: `Harsh logs films on Letterboxd (@${LETTERBOXD_PROFILE.username}). Recent activity there includes ${LETTERBOXD_FILMS[0]?.title ?? 'a small number of logged films'}.`,
    keywords: ['film', 'movies', 'letterboxd', 'what does he watch'],
    aliases: ['Does Harsh watch movies?', 'What is his Letterboxd?'],
    priority: 50,
    lastVerified: TODAY,
    source: { label: 'Letterboxd', action: { type: 'open-window', windowId: 'letterboxd' } },
  },
  {
    id: 'music-interests',
    category: 'music-interests',
    title: 'Music',
    text: `Harsh collects vinyl records. He has a public Spotify playlist, "${SPOTIFY_PLAYLIST.title}," described as a collection of songs he keeps coming back to.`,
    keywords: ['music', 'spotify', 'vinyl', 'playlist', 'what does he listen to'],
    aliases: ['What music does Harsh like?', 'Does he have a Spotify playlist?'],
    priority: 50,
    lastVerified: TODAY,
    source: { label: 'Spotify', action: { type: 'open-window', windowId: 'spotify' } },
  },
  {
    id: 'publications-overview',
    category: 'publications',
    title: "Harsh's publications",
    text: `Harsh has ${PUBLICATIONS.length} verified publications, listed on his Google Scholar profile: ${PUBLICATIONS.map((p) => `"${p.title}" (${p.year})`).join('; ')}.`,
    keywords: ['publications', 'papers', 'research papers', 'what has he published', 'google scholar'],
    aliases: ['What has Harsh published?', 'Does he have research papers?'],
    priority: 100,
    lastVerified: TODAY,
    source: { label: 'Publications', action: { type: 'open-window', windowId: 'publications' } },
  },
  ...PUBLICATIONS.map((pub) => ({
    id: `publication-${pub.id}`,
    category: 'publications',
    title: pub.title,
    text: `"${pub.title}" by ${pub.authors.join(', ')}. Published in ${pub.venue}${pub.publisher ? ` (${pub.publisher})` : ''}, ${pub.year}${pub.pages ? `, pages ${pub.pages}` : ''}.${pub.doi ? ` DOI: ${pub.doi}.` : ''}`,
    keywords: [pub.title.toLowerCase(), pub.venue.toLowerCase(), String(pub.year), ...pub.authors.map((a) => a.toLowerCase())],
    aliases: [`Tell me about "${pub.title}".`],
    priority: 70,
    lastVerified: TODAY,
    source: { label: 'Publications', action: { type: 'open-window', windowId: 'publications', data: { publicationId: pub.id } } },
  })),
  {
    id: 'talks-overview',
    category: 'talks',
    title: 'Has Harsh given talks?',
    text: TALKS.length === 1
      ? `Harsh has given one featured talk, presented to an industry audience: "${TALKS[0].title}" at the ${TALKS[0].eventTitle}, ${TALKS[0].venue}, on ${TALKS[0].date}.`
      : `Harsh has given ${TALKS.length} talks, including: ${TALKS.map((t) => t.title).join('; ')}.`,
    keywords: ['talks', 'presentations', 'has he spoken', 'public speaking', 'nserc talk'],
    aliases: ['Has Harsh spoken publicly?', 'What talks has he given?', 'What did he present at NSERC?'],
    priority: 100,
    lastVerified: TODAY,
    source: { label: 'Talks', action: { type: 'open-window', windowId: 'talks', data: { talkId: TALKS[0]?.id } } },
  },
  // TALKS[0].introduction is written in Harsh's own first-person voice (as
  // published in the talk's full editorial story) — restated in the third
  // person here for the same reason as research-interests above.
  ...(TALKS[0] ? [{
    id: `talk-${TALKS[0].id}`,
    category: 'talks',
    title: TALKS[0].title,
    text: `Harsh presented research developed in collaboration with Nextria Inc. at the ${TALKS[0].eventTitle}. The talk, titled "${TALKS[0].title}," was a ${TALKS[0].format.toLowerCase()} at ${TALKS[0].venue} on ${TALKS[0].date}. It introduced the growing difficulty of determining whether digital images can be trusted, and how forensic and contextual signals can be examined together to support more reliable assessments of image authenticity.`,
    keywords: [...TALKS[0].keywords],
    aliases: ['What was the NSERC talk about?', 'What did Harsh present at Dalhousie?'],
    priority: 80,
    lastVerified: TODAY,
    source: { label: 'NSERC Talk', action: { type: 'open-window', windowId: 'talks', data: { talkId: TALKS[0].id } } },
  }] : []),
];

// ---------- Validation ----------
// Every rule here rejects the whole corpus rather than silently dropping a
// bad chunk — a structurally invalid corpus should fail the build loudly
// (see the "Build integration" comment at the bottom), not ship a subtly
// incomplete knowledge base.
function validateChunks(list) {
  const problems = [];
  const seenIds = new Set();

  const BLOCKED_TEXT_PATTERNS = [
    /\bapi[_-]?key\b/i, /\bsecret\b/i, /\bpassword\b/i, /\btoken\b/i,
    /\/Users\//, /\bhome address\b/i, /\bphone number\b/i,
  ];

  for (const chunk of list) {
    if (!chunk.id || typeof chunk.id !== 'string') { problems.push('a chunk is missing a string id'); continue; }
    if (seenIds.has(chunk.id)) { problems.push(`duplicate chunk id "${chunk.id}"`); continue; }
    seenIds.add(chunk.id);

    if (!chunk.category) problems.push(`${chunk.id}: missing category`);
    if (!chunk.title) problems.push(`${chunk.id}: missing title`);
    if (!chunk.text || !chunk.text.trim()) problems.push(`${chunk.id}: empty text`);
    if (!Array.isArray(chunk.keywords) || !chunk.keywords.length) problems.push(`${chunk.id}: missing keywords`);
    if (!Number.isFinite(chunk.priority)) problems.push(`${chunk.id}: invalid priority`);
    if (!chunk.source?.label) problems.push(`${chunk.id}: missing source.label`);
    if (!validateHarshBotAction(chunk.source?.action)) problems.push(`${chunk.id}: source.action failed whitelist validation`);

    for (const pattern of BLOCKED_TEXT_PATTERNS) {
      if (pattern.test(chunk.text ?? '') || pattern.test(JSON.stringify(chunk.keywords ?? []))) {
        problems.push(`${chunk.id}: text/keywords matched a blocked pattern (${pattern})`);
      }
    }
  }

  return problems;
}

async function main() {
  const problems = validateChunks(chunks);
  if (problems.length) {
    console.error('HarshBot knowledge build failed validation:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }

  const document = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    owner: 'Harsh Kaushik',
    chunks,
  };

  const json = `${JSON.stringify(document, null, 2)}\n`;

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });

  let previous = null;
  try {
    previous = await readFile(OUTPUT_PATH, 'utf8');
  } catch {
    previous = null;
  }
  const stripTimestamp = (text) => (text ?? '').replace(/"generatedAt":\s*"[^"]*"/, '"generatedAt":""');
  if (previous !== null && stripTimestamp(previous) === stripTimestamp(json)) {
    console.log(`HarshBot knowledge unchanged (${chunks.length} chunks) — skipping write.`);
    return;
  }

  await writeFile(OUTPUT_PATH, json, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}: ${chunks.length} chunks across ${new Set(chunks.map((c) => c.category)).size} categories.`);
}

main().catch((error) => {
  console.error(`HarshBot knowledge build failed: ${error.message}`);
  process.exit(1);
});

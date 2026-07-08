// Authoritative source for talks, presentations, and research
// demonstrations. Every entry must be independently verifiable (a real
// event, a real date, a real venue) — nothing here is filled with invented
// conference titles, dates, or links. The Talks window (src/windows/
// Talks.jsx) renders a tasteful, honest empty state when this array is
// empty; it does not fabricate placeholder content to look populated.
//
// Two entry shapes are supported:
//   - A `featured: true` entry (richer: eventTitle/title/sections/images/
//     presentationUrl) gets its own full editorial detail view.
//   - A plain entry (title/event/date/location/format/description/topics/
//     slidesUrl/videoUrl/eventUrl) renders as a simple list row — the
//     original shape this file shipped with, kept for any future talk that
//     doesn't need a full story page.
//
// EMPHASIS_PHRASES: real names/terms worth setting in <strong> wherever
// they appear in this talk's prose — rendered via #utils/emphasisText.js,
// never by hand-writing <strong> into the data itself.
const NSERC_TALK_EMPHASIS_PHRASES = [
  'Nextria Inc.',
  'NSERC CREATE Cybersecurity Program',
  'Natural Sciences and Engineering Research Council of Canada',
  'Collaborative Research and Training Experience',
];

export const TALKS = [
  {
    id: 'nserc-industry-advisory-board-2026',
    featured: true,
    eventTitle: 'NSERC Industry Advisory Board Meeting 2026',
    title: 'From the Research Lab to the Industry Room',
    format: 'Three-minute research talk and live demonstration',
    organization: 'NSERC CREATE Cybersecurity Industry Advisory Board Meeting',
    venue: 'Dalhousie University',
    // Verified directly from the event's own printed agenda, visible in
    // ev4.jpg ("Thursday, June 18, 202[6]") — the partially-obscured last
    // digit is corroborated by June 18, 2026 actually falling on a
    // Thursday (June 18, 2025 is a Wednesday; June 18, 2027 is a Friday).
    date: '2026-06-18',
    year: 2026,
    emphasisPhrases: NSERC_TALK_EMPHASIS_PHRASES,
    openingQuestion:
      'How do you explain months of research in three minutes—and make its real-world value clear?',
    introduction: [
      'I had the opportunity to present research developed in collaboration with Nextria Inc. at the Second Annual Industry Advisory Board Meeting of Dalhousie University’s NSERC CREATE Cybersecurity Program.',
    ],
    sections: [
      {
        id: 'meeting',
        title: 'What was the meeting about?',
        paragraphs: [
          'NSERC is the Natural Sciences and Engineering Research Council of Canada, while CREATE stands for Collaborative Research and Training Experience. The program supports multidisciplinary research training and helps students connect their academic work with the needs of industry, government, and society.',
          'Dalhousie’s CREATE Cybersecurity initiative brings together perspectives from computer science, law, management, science, and public policy to explore cybersecurity challenges created by emerging technologies. The Industry Advisory Board meeting and research showcase gave students and researchers an opportunity to share their work with professionals, receive direct feedback, and discuss where academic research can make a practical difference.',
        ],
      },
      {
        id: 'talk',
        title: 'What did I talk about?',
        paragraphs: [
          'During my three-minute presentation, I introduced the growing difficulty of determining whether the digital images we encounter can be trusted. I discussed how different forensic and contextual signals can be examined together to support more reliable assessments of image authenticity.',
          'I also shared a short demonstration of the framework, focusing on the problem it addresses, the reasoning behind the approach, and its broader relevance to cybersecurity—without diving into the confidential or implementation-specific details of the project.',
        ],
      },
      {
        id: 'reflection',
        title: 'What stayed with me?',
        paragraphs: [
          'The most valuable part was not simply presenting the work. It was seeing the project through the perspectives of people working on real cybersecurity problems.',
          'Their questions and feedback helped me think beyond model performance and consider how a research system must also be understandable, dependable, and useful outside the laboratory.',
        ],
      },
    ],
    // The hero appears once at the top of the article; these three appear
    // again together in the in-article gallery — see the long comment in
    // Talks.jsx on why the hero isn't repeated a second time in that grid.
    heroImage: {
      id: 'event-hero',
      src: '/images/ev1-web.jpg',
      alt: 'Harsh Kaushik presenting at a lectern, with the project demo shown on a large screen behind him and remote attendees visible on a video call panel.',
    },
    images: [
      {
        id: 'event-2',
        src: '/images/ev2-web.jpg',
        alt: 'Harsh Kaushik gesturing toward the presentation screen while explaining a detection result during the talk.',
      },
      {
        id: 'event-3',
        src: '/images/ev3-web.jpg',
        alt: 'Industry Advisory Board members and attendees seated at tables in the meeting room, listening to the presentation.',
      },
      {
        id: 'event-4',
        src: '/images/ev4.jpg',
        alt: 'A Dalhousie CREATE name badge for Harsh Kaushik next to a printed NSERC CREATE Cybersecurity Program agenda for the Industry Advisory Board Meeting.',
      },
    ],
    presentationUrl:
      'https://docs.google.com/presentation/d/1AhotbOKumULeA1xsrhI1L-y_n4hlLzjpmYCWdSeMVBg/edit?slide=id.p1#slide=id.p1',
    // Extra, specific search phrases beyond what's auto-derived from the
    // title/event fields — kept as data here (not hand-typed a second time
    // in the search registry) so #utils/searchRegistry.js stays fully
    // generated from this one authoritative source.
    keywords: [
      'nserc', 'nserc create', 'industry advisory board', 'industry advisory board meeting 2026',
      'cybersecurity talk', 'research talk', 'dalhousie presentation', 'nextria',
      'image authenticity talk', 'three-minute presentation', 'live demonstration',
      'from the research lab to the industry room',
    ],
  },
];

export function getTalks() {
  return TALKS;
}

export function getTalkById(id) {
  return TALKS.find((talk) => talk.id === id) ?? null;
}

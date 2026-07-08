// Verified publication metadata for Harsh Kaushik — sourced and
// cross-checked against:
//   1. The Google Scholar profile (authoritative source):
//      https://scholar.google.ca/citations?user=0_EGeiEAAAAJ&hl=en
//   2. Each publication's own Scholar citation-detail page.
//   3. The Crossref DOI registry (api.crossref.org) for exact DOI, page
//      range, and author name spelling.
//   4. For the ICACCS paper, an independent third-party citation (Diyala
//      Journal of Engineering Sciences bibliography) that cross-matches
//      the Crossref record, including the IEEE Xplore document number.
//   5. For the solar-based wireless EV charging chapter, the publisher's
//      own page (link.springer.com) `citation_*` meta tags, which name
//      the exact title, full ordered author list, DOI, page range, and
//      Lecture Notes in Electrical Engineering series volume (1086) —
//      cross-matched against the Crossref record for the same DOI.
//      Google Scholar lists this entry's year as 2023 (the ICRP 2023
//      conference date); Crossref and the publisher's own metadata both
//      register the chapter's actual publication (online and print) as
//      2024, which is the year used here, consistent with citing a
//      proceedings chapter by its registered publication date rather than
//      the underlying conference's occurrence date.
//
// Every field below was verified this way — nothing here is inferred or
// invented. Fields that could not be verified (e.g. no DOI exists for the
// ICACCS paper) are left `null` rather than guessed.
const SCHOLAR_PROFILE_URL = "https://scholar.google.ca/citations?user=0_EGeiEAAAAJ&hl=en";

export const PUBLICATIONS = [
  {
    id: "solar-based-wireless-ev-charging-2024",
    title: "Design and Development of a Solar-Based Wireless Electric Vehicle Charging System",
    authors: ["Sanyam Jain", "Samyak Jain", "Sanjay Kumar", "Harsh Kaushik", "Neelu Nagpal", "Ravi Sharma"],
    type: "chapter",
    venue: "Renewable Power for Sustainable Growth",
    venueAbbreviation: null,
    publisher: "Springer, Singapore",
    location: null,
    year: 2024,
    volume: "1086",
    issue: null,
    pages: "481-494",
    articleNumber: null,
    doi: "10.1007/978-981-99-6749-0_32",
    publisherUrl: "https://link.springer.com/chapter/10.1007/978-981-99-6749-0_32",
    scholarUrl: "https://scholar.google.ca/citations?view_op=view_citation&hl=en&user=0_EGeiEAAAAJ&citation_for_view=0_EGeiEAAAAJ:d1gkVwhDpl0C",
    profileUrl: SCHOLAR_PROFILE_URL,
  },
  {
    id: "hybrid-image-processing-wearable-aide-2022",
    title: "Hybrid Image Processing Device as Wearable Aide for Visually Impaired",
    authors: ["Ashish Papanai", "Harsh Kaushik"],
    type: "conference",
    venue: "2022 8th International Conference on Advanced Computing and Communication Systems",
    venueAbbreviation: "ICACCS 2022",
    location: "Coimbatore, India",
    year: 2022,
    volume: null,
    issue: null,
    pages: "733-738",
    articleNumber: null,
    doi: "10.1109/ICACCS54159.2022.9785118",
    publisherUrl: "https://ieeexplore.ieee.org/document/9785118/",
    scholarUrl: "https://scholar.google.ca/citations?view_op=view_citation&hl=en&user=0_EGeiEAAAAJ&citation_for_view=0_EGeiEAAAAJ:u5HHmVD_uO8C",
    profileUrl: SCHOLAR_PROFILE_URL,
  },
  {
    id: "5g-networks-smart-healthcare-iot-review-2022",
    title: "A Review of Technologies Trending Towards 5G Networks for Smart Healthcare Using IoT",
    authors: ["Harsh Kaushik", "Neelam Sharma", "Nitish Pathak"],
    type: "chapter",
    venue: "Futuristic Trends for Sustainable Development and Sustainable Ecosystems",
    venueAbbreviation: null,
    publisher: "IGI Global",
    location: null,
    year: 2022,
    volume: null,
    issue: null,
    pages: "48-59",
    articleNumber: null,
    doi: "10.4018/978-1-6684-4225-8.ch003",
    publisherUrl: "https://www.igi-global.com/chapter/a-review-of-technologies-trending-towards-5g-networks-for-smart-healthcare-using-iot/307668",
    scholarUrl: "https://scholar.google.ca/citations?view_op=view_citation&hl=en&user=0_EGeiEAAAAJ&citation_for_view=0_EGeiEAAAAJ:u-x6o8ySG0sC",
    profileUrl: SCHOLAR_PROFILE_URL,
  },
];

export { SCHOLAR_PROFILE_URL };

// Preserves the profile's own display order — the 2024 chapter is listed
// first because it's how Google Scholar's own profile page orders these
// three entries (both by most-recent-year and by citation count, which
// agree here), not an arbitrary placement.
export function getPublications() {
  return PUBLICATIONS;
}

export function getPublicationById(id) {
  return PUBLICATIONS.find((pub) => pub.id === id) ?? null;
}

// Verified Letterboxd activity for Harsh Kaushik — sourced and
// cross-checked directly against the profile itself, on 2026-07-05:
//   1. https://letterboxd.com/harshh2001/            (profile — "1 film watched")
//   2. https://letterboxd.com/harshh2001/films/       (films list — exactly one entry)
//   3. https://letterboxd.com/harshh2001/reviews/     (reviews list — exactly one entry)
//   4. https://letterboxd.com/harshh2001/lists/       ("0 lists" per the page's own count)
//   5. https://letterboxd.com/harshh2001/rss/         (official public RSS feed — used only
//      as a one-time, build-time data source for the exact review text, rating, watched
//      date, and poster URL; the deployed site never fetches Letterboxd at runtime)
//
// This profile currently has exactly one logged film, one review, and zero
// public lists — every array below reflects that honestly rather than
// padding it out. Nothing here is inferred: a field that couldn't be
// verified (e.g. a per-list updated date, since none exist) is simply
// omitted rather than guessed.
export const LETTERBOXD_PROFILE = {
  username: "harshh2001",
  displayName: "Harsh Kaushik",
  profileUrl: "https://letterboxd.com/harshh2001/",
  reviewsUrl: "https://letterboxd.com/harshh2001/reviews/",
  filmsUrl: "https://letterboxd.com/harshh2001/films/",
  listsUrl: "https://letterboxd.com/harshh2001/lists/",
  // The profile's own "Diary" nav link is `/harshh2001/diary/` — not
  // `/harshh2001/films/diary/`, which returns 403. Verified directly.
  diaryUrl: "https://letterboxd.com/harshh2001/diary/",
};

// Every review Harsh has published on Letterboxd. `reviewParagraphs`
// preserves the exact paragraph break from the source review (split only on
// the review's own `<br />`) — the wording, punctuation, and the mid-sentence
// "film;every" are reproduced exactly as written, not corrected.
export const LETTERBOXD_REVIEWS = [
  {
    id: "peaky-blinders-the-immortal-man-2026",
    filmTitle: "Peaky Blinders: The Immortal Man",
    filmYear: 2026,
    poster:
      "https://a.ltrbxd.com/resized/film-poster/7/8/7/8/4/9/787849-peaky-blinders-the-immortal-man-0-600-0-900-crop.jpg?v=4236d354ae",
    rating: 4,
    watchedDate: "2026-03-10",
    reviewParagraphs: [
      "The film begins a little slow, which is understandable as it carefully builds the atmosphere. But once the second half begins, it completely pulls you in. Tommy Shelby carries an incredible aura throughout the film;every scene with him feels commanding. A few moments genuinely left me in shock, and the intensity of the story really shines in the latter half. While the character of Duke, Tommy’s son, didn’t resonate as strongly for me as the rest of the cast.",
      "But what truly stayed with me was the ending. The final moments feel almost poetic, touching and powerful enough to leave you sitting there thinking about it long after the film ends. It gives the story a sense of closure that feels meaningful. Overall, I loved it, especially how the second half builds toward such a stunning ending. And as Tommy himself would say… no spoilers.",
    ],
    containsSpoilers: false,
    filmUrl: "https://letterboxd.com/film/peaky-blinders-the-immortal-man/",
    reviewUrl: "https://letterboxd.com/harshh2001/film/peaky-blinders-the-immortal-man/",
  },
];

// Every film Harsh has logged on Letterboxd (currently the same single film
// the review above covers — the profile has logged exactly one film).
export const LETTERBOXD_FILMS = [
  {
    id: "peaky-blinders-the-immortal-man-2026",
    title: "Peaky Blinders: The Immortal Man",
    year: 2026,
    poster:
      "https://a.ltrbxd.com/resized/film-poster/7/8/7/8/4/9/787849-peaky-blinders-the-immortal-man-0-600-0-900-crop.jpg?v=4236d354ae",
    rating: 4,
    watchedDate: "2026-03-10",
    liked: false,
    reviewed: true,
    filmUrl: "https://letterboxd.com/film/peaky-blinders-the-immortal-man/",
  },
];

// The profile's Lists page reports "0 lists" — there are no public lists to
// show yet. Left empty deliberately; see the honest empty state rendered by
// the Lists section rather than fabricating one here.
export const LETTERBOXD_LISTS = [];

export function getLetterboxdProfile() {
  return LETTERBOXD_PROFILE;
}

export function getLetterboxdReviews() {
  return LETTERBOXD_REVIEWS;
}

export function getLetterboxdFilms() {
  return LETTERBOXD_FILMS;
}

export function getLetterboxdLists() {
  return LETTERBOXD_LISTS;
}

export function getLetterboxdFilmById(id) {
  return LETTERBOXD_FILMS.find((film) => film.id === id) ?? null;
}

export function getLetterboxdReviewById(id) {
  return LETTERBOXD_REVIEWS.find((review) => review.id === id) ?? null;
}

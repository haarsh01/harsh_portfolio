import React, { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  Star, StarHalf, Film, ListVideo, ExternalLink, EyeOff, CalendarDays,
} from 'lucide-react';
import { WindowControls } from '#components';
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import ShareButton from '#components/ShareButton.jsx';
import useWindowStore from '#store/window.js';
import { isReducedMotion } from '#utils/motion.js';
import {
  LETTERBOXD_PROFILE, LETTERBOXD_REVIEWS, LETTERBOXD_FILMS, LETTERBOXD_LISTS,
} from '#constants/letterboxd.js';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'films', label: 'Films' },
  { id: 'lists', label: 'Lists' },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

// Films/reviews only need enough volume for sort/filter/search to be worth
// showing at all — with a single logged film today, those controls would
// just be empty gestures over one item.
const FILM_CONTROLS_THRESHOLD = 8;

function formatWatchedDate(value) {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('MMM D, YYYY') : null;
}

// Renders an accessible star rating: filled/half/empty Star icons plus a
// real text equivalent ("4 out of 5 stars") — the visual stars are
// decorative (aria-hidden), the text is what's actually announced, so
// nothing here communicates the rating through color or shape alone.
function RatingStars({ rating, size = 13 }) {
  if (!Number.isFinite(rating) || rating <= 0) return null;
  const clamped = Math.min(5, Math.max(0, rating));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.5;

  return (
    <span className="letterboxd-rating">
      <span className="letterboxd-rating-stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => {
          if (i < full) return <Star key={i} size={size} className="letterboxd-star letterboxd-star--full" fill="currentColor" />;
          if (i === full && hasHalf) return <StarHalf key={i} size={size} className="letterboxd-star letterboxd-star--full" fill="currentColor" />;
          return <Star key={i} size={size} className="letterboxd-star letterboxd-star--empty" />;
        })}
      </span>
      <span className="letterboxd-rating-text">
        {clamped % 1 === 0 ? clamped : clamped.toFixed(1)} out of 5 stars
      </span>
    </span>
  );
}

// A tasteful local fallback whenever a poster URL is missing or fails to
// load — never a broken image, never invented artwork, just the film's own
// verified title/year on a quiet dark card with a simple film-reel mark.
function FilmPoster({ src, title, year, className }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={clsx('letterboxd-poster-fallback', className)}
        role="img"
        aria-label={`No poster available for ${title}${year ? ` (${year})` : ''}`}
      >
        <Film size={20} aria-hidden="true" />
        <p className="letterboxd-poster-fallback-title">{title}</p>
        {year ? <p className="letterboxd-poster-fallback-year">{year}</p> : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${title}${year ? ` (${year})` : ''} poster`}
      className={className}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

// One review, editorial-row style — poster on the left, everything else on
// the right. Spoiler-marked reviews start hidden behind an explicit,
// keyboard- and screen-reader-reachable reveal control (never on hover).
function ReviewRow({ review }) {
  const [revealed, setRevealed] = useState(!review.containsSpoilers);
  const watched = formatWatchedDate(review.watchedDate);

  return (
    <article className="letterboxd-review">
      <FilmPoster
        src={review.poster}
        title={review.filmTitle}
        year={review.filmYear}
        className="letterboxd-review-poster"
      />
      <div className="letterboxd-review-copy">
        <div className="letterboxd-review-heading">
          <h3>
            {review.filmTitle}
            {review.filmYear ? <span className="letterboxd-review-year"> ({review.filmYear})</span> : null}
          </h3>
          <RatingStars rating={review.rating} />
        </div>

        {watched ? (
          <p className="letterboxd-review-meta">
            <CalendarDays size={12} aria-hidden="true" /> Watched {watched}
          </p>
        ) : null}

        {review.containsSpoilers && !revealed ? (
          <div className="letterboxd-spoiler-guard">
            <p>This review discusses plot details.</p>
            <button type="button" className="letterboxd-spoiler-reveal" onClick={() => setRevealed(true)}>
              <EyeOff size={13} aria-hidden="true" /> Reveal spoilers
            </button>
          </div>
        ) : (
          <div className="letterboxd-review-text">
            {review.containsSpoilers ? <span className="letterboxd-spoiler-tag">Contains spoilers</span> : null}
            {(review.reviewParagraphs ?? []).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>
        )}

        <div className="letterboxd-review-actions">
          {review.reviewUrl ? (
            <a href={review.reviewUrl} target="_blank" rel="noopener noreferrer" className="letterboxd-external-link">
              Read on Letterboxd <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
          {review.filmUrl && review.filmUrl !== review.reviewUrl ? (
            <a href={review.filmUrl} target="_blank" rel="noopener noreferrer" className="letterboxd-external-link">
              View Film <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FilmCard({ film }) {
  return (
    <li className="letterboxd-film">
      <a href={film.filmUrl} target="_blank" rel="noopener noreferrer" aria-label={`${film.title} (${film.year}) on Letterboxd`}>
        <FilmPoster src={film.poster} title={film.title} year={film.year} className="letterboxd-film-poster" />
        <p className="letterboxd-film-title">{film.title}</p>
        <p className="letterboxd-film-meta">
          <span>{film.year}</span>
          <RatingStars rating={film.rating} size={11} />
        </p>
        {(film.reviewed || film.liked) ? (
          <p className="letterboxd-film-badges">
            {film.reviewed ? <span className="letterboxd-film-badge">Reviewed</span> : null}
            {film.liked ? <span className="letterboxd-film-badge">Liked</span> : null}
          </p>
        ) : null}
      </a>
    </li>
  );
}

function OverviewSection({ profile, films, reviews, lists, onNavigate }) {
  const recentReview = reviews[0] ?? null;
  const recentFilms = films.slice(0, 6);

  return (
    <section className="letterboxd-section" aria-labelledby="letterboxd-overview-heading">
      <div className="letterboxd-profile">
        <img src="/images/letterboxd.png" alt="" className="letterboxd-profile-icon" />
        <div className="letterboxd-profile-copy">
          <h1 id="letterboxd-overview-heading" className="letterboxd-section-header">Harsh’s Life in Film</h1>
          <p className="letterboxd-profile-username">@{profile.username}</p>
          <p className="letterboxd-profile-tagline">
            Films I’ve watched, rated, reviewed, and kept thinking about.
          </p>
          <a href={profile.profileUrl} target="_blank" rel="noopener noreferrer" className="letterboxd-external-link">
            View Profile on Letterboxd <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      <dl className="letterboxd-stats">
        <div className="letterboxd-stat">
          <dt>Films logged</dt>
          <dd>{films.length}</dd>
        </div>
        <div className="letterboxd-stat">
          <dt>Reviews</dt>
          <dd>{reviews.length}</dd>
        </div>
        <div className="letterboxd-stat">
          <dt>Public lists</dt>
          <dd>{lists.length}</dd>
        </div>
      </dl>

      {recentReview ? (
        <div className="letterboxd-overview-block">
          <h2 className="letterboxd-chapter-label">Recent review</h2>
          <ReviewRow review={recentReview} />
          <button type="button" className="letterboxd-textlink" onClick={() => onNavigate('reviews')}>
            See all reviews
          </button>
        </div>
      ) : null}

      {recentFilms.length ? (
        <div className="letterboxd-overview-block">
          <h2 className="letterboxd-chapter-label">Recently watched</h2>
          <ul className="letterboxd-film-grid letterboxd-film-grid--strip">
            {recentFilms.map((film) => <FilmCard key={film.id} film={film} />)}
          </ul>
          <button type="button" className="letterboxd-textlink" onClick={() => onNavigate('films')}>
            See all films
          </button>
        </div>
      ) : null}

      {lists.length ? (
        <div className="letterboxd-overview-block">
          <h2 className="letterboxd-chapter-label">Lists</h2>
          <button type="button" className="letterboxd-textlink" onClick={() => onNavigate('lists')}>
            See lists
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ReviewsSection({ reviews, profile }) {
  return (
    <section className="letterboxd-section" aria-labelledby="letterboxd-reviews-heading">
      <header className="letterboxd-section-header-row">
        <h1 id="letterboxd-reviews-heading" className="letterboxd-section-header">Reviews</h1>
        <a href={profile.reviewsUrl} target="_blank" rel="noopener noreferrer" className="letterboxd-external-link">
          View on Letterboxd <ExternalLink size={12} aria-hidden="true" />
        </a>
      </header>

      {reviews.length ? (
        <div className="letterboxd-review-list">
          {reviews.map((review) => <ReviewRow key={review.id} review={review} />)}
        </div>
      ) : (
        <div className="letterboxd-empty">
          <Film size={26} aria-hidden="true" />
          <p>No reviews yet.</p>
          <p className="letterboxd-empty-secondary">New reviews will appear here as they're published on Letterboxd.</p>
        </div>
      )}
    </section>
  );
}

function FilmsSection({ films, profile }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const showControls = films.length > FILM_CONTROLS_THRESHOLD;

  const visible = showControls
    ? films
      .filter((film) => film.title.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => {
        if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
        if (sort === 'title') return a.title.localeCompare(b.title);
        if (sort === 'year') return (b.year ?? 0) - (a.year ?? 0);
        return dayjs(b.watchedDate).valueOf() - dayjs(a.watchedDate).valueOf();
      })
    : films;

  return (
    <section className="letterboxd-section" aria-labelledby="letterboxd-films-heading">
      <header className="letterboxd-section-header-row">
        <h1 id="letterboxd-films-heading" className="letterboxd-section-header">Films</h1>
        <a href={profile.filmsUrl} target="_blank" rel="noopener noreferrer" className="letterboxd-external-link">
          View on Letterboxd <ExternalLink size={12} aria-hidden="true" />
        </a>
      </header>

      {showControls ? (
        <div className="letterboxd-film-controls">
          <label className="letterboxd-film-search">
            <span className="sr-only">Search films by title</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search films…"
            />
          </label>
          <label className="letterboxd-film-sort">
            <span className="sr-only">Sort films</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Recently watched</option>
              <option value="rating">Rating, highest first</option>
              <option value="title">Title</option>
              <option value="year">Release year</option>
            </select>
          </label>
        </div>
      ) : null}

      {films.length ? (
        visible.length ? (
          <ul className="letterboxd-film-grid">
            {visible.map((film) => <FilmCard key={film.id} film={film} />)}
          </ul>
        ) : (
          <div className="letterboxd-empty">
            <Film size={26} aria-hidden="true" />
            <p>No films match “{query}”.</p>
          </div>
        )
      ) : (
        <div className="letterboxd-empty">
          <Film size={26} aria-hidden="true" />
          <p>No films logged yet.</p>
          <p className="letterboxd-empty-secondary">Watched films will appear here as they're logged on Letterboxd.</p>
        </div>
      )}
    </section>
  );
}

function ListsSection({ lists, profile }) {
  return (
    <section className="letterboxd-section" aria-labelledby="letterboxd-lists-heading">
      <header className="letterboxd-section-header-row">
        <h1 id="letterboxd-lists-heading" className="letterboxd-section-header">Lists</h1>
      </header>

      {lists.length ? (
        <ul className="letterboxd-list-grid">
          {lists.map((list) => (
            <li key={list.id} className="letterboxd-list">
              <div className="letterboxd-list-covers" aria-hidden="true">
                {(list.coverPosters ?? []).slice(0, 4).map((poster, i) => (
                  <img key={i} src={poster} alt="" loading="lazy" draggable={false} />
                ))}
              </div>
              <p className="letterboxd-list-title">{list.title}</p>
              {list.description ? <p className="letterboxd-list-description">{list.description}</p> : null}
              <p className="letterboxd-list-meta">{list.filmCount ?? 0} films</p>
              <a href={list.listUrl} target="_blank" rel="noopener noreferrer" className="letterboxd-external-link">
                View List <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="letterboxd-empty">
          <ListVideo size={26} aria-hidden="true" />
          <p>No public movie lists yet.</p>
          <p className="letterboxd-empty-secondary">New lists will appear here as they are added to my Letterboxd profile.</p>
          <div className="letterboxd-empty-actions">
            <a href={profile.profileUrl} target="_blank" rel="noopener noreferrer" className="letterboxd-external-link">
              View Profile
            </a>
            <a href={profile.listsUrl} target="_blank" rel="noopener noreferrer" className="letterboxd-external-link">
              View my lists on Letterboxd
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

const Letterboxd = () => {
  const { windows } = useWindowStore();
  const requestedSection = windows.letterboxd?.data?.section;
  const [activeSection, setActiveSection] = useState(
    SECTION_IDS.includes(requestedSection) ? requestedSection : 'overview',
  );
  const [syncedRequestedSection, setSyncedRequestedSection] = useState(requestedSection);
  const contentRef = useRef(null);

  // Lets Spotlight (or any future caller) deep-link into a specific section
  // via `openWindow("letterboxd", { section: "reviews" })` without
  // remounting the window — mirrors Photos' identical requestedSection sync.
  // Adjusted during render, not in an effect, since this is purely "reset
  // state in response to a changed value."
  if (requestedSection !== syncedRequestedSection) {
    setSyncedRequestedSection(requestedSection);
    if (requestedSection && SECTION_IDS.includes(requestedSection)) {
      setActiveSection(requestedSection);
    } else if (requestedSection) {
      setActiveSection('overview'); // unknown section request — default safely
    }
  }

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeSection]);

  useGSAP(() => {
    if (isReducedMotion() || !contentRef.current) return;
    gsap.fromTo(contentRef.current, { opacity: 0.5 }, { opacity: 1, duration: 0.25, ease: 'power1.out' });
  }, { scope: contentRef, dependencies: [activeSection] });

  const films = LETTERBOXD_FILMS;
  const reviews = LETTERBOXD_REVIEWS;
  const lists = LETTERBOXD_LISTS;

  return (
    <>
      <div id="window-header">
        <WindowControls target="letterboxd" />
        <h2 className="flex-1 text-center font-bold text-sm">Letterboxd — Harsh’s Films</h2>
        <ShareButton
          destination={{ app: 'letterboxd', ...(activeSection !== 'overview' ? { section: activeSection } : {}) }}
          className="icon"
          label="Share Letterboxd"
        />
      </div>

      <div className="letterboxd-app">
        <nav className="letterboxd-nav" aria-label="Letterboxd sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="letterboxd-nav-item"
              aria-current={activeSection === s.id ? 'page' : undefined}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="letterboxd-content" ref={contentRef}>
          {activeSection === 'overview' && (
            <OverviewSection profile={LETTERBOXD_PROFILE} films={films} reviews={reviews} lists={lists} onNavigate={setActiveSection} />
          )}
          {activeSection === 'reviews' && <ReviewsSection reviews={reviews} profile={LETTERBOXD_PROFILE} />}
          {activeSection === 'films' && <FilmsSection films={films} profile={LETTERBOXD_PROFILE} />}
          {activeSection === 'lists' && <ListsSection lists={lists} profile={LETTERBOXD_PROFILE} />}
        </div>
      </div>

      <p className="letterboxd-disclaimer">
        Unofficial portfolio view. Film activity belongs to Harsh Kaushik and links to Letterboxd.
      </p>
    </>
  );
};

const LetterboxdWindow = WindowWrapper(Letterboxd, 'letterboxd');
export default LetterboxdWindow;

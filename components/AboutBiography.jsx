import React, { useRef } from 'react';
import { ABOUT_CONTENT, ABOUT_EMPHASIS_PHRASES, ABOUT_ORGANIZATIONS } from '#constants/about.js';
import { useAboutScrollAnimations } from '#hooks/useAboutScrollAnimations.js';

function organizationLogoUrl(file) {
  return `${import.meta.env.BASE_URL}images/organizations/${encodeURIComponent(file)}`;
}

// One real logo card — rendered twice per page load (the real, announced
// group and an aria-hidden duplicate right after it that makes the
// marquee loop read as seamless). All 8 are small (a few KB to ~50KB
// each) and every one of them is meant to be seen as the strip scrolls,
// so `loading="lazy"` is deliberately not used here — with the marquee
// clipped by `overflow: hidden`, a lazily-loaded card positioned outside
// the initial visible slice wouldn't fetch until the animation had
// already carried it partway across, popping in mid-motion instead of
// being ready from the start. Never a link: none of these organizations
// have one single obvious official URL to send a visitor to from here,
// and a static logo is explicitly fine per this section's own spec.
function OrganizationLogo({ org }) {
  return (
    <div className="about-org-card">
      <img
        src={organizationLogoUrl(org.file)}
        alt={org.alt}
        className="about-org-logo"
        draggable={false}
      />
    </div>
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const EMPHASIS_PATTERN = new RegExp(`(${ABOUT_EMPHASIS_PHRASES.map(escapeRegExp).join('|')})`, 'g');
const EMPHASIS_SET = new Set(ABOUT_EMPHASIS_PHRASES);

// Splits on exact phrase matches only — the capturing group in the regex
// means `String.split` returns matched and unmatched segments in order, so
// rejoining every part always reproduces the original sentence exactly.
// Restrained, data-driven emphasis, never a rewrite of the wording.
function withEmphasis(text, keyPrefix) {
  return text
    .split(EMPHASIS_PATTERN)
    .filter((part) => part !== '')
    .map((part, i) => (
      EMPHASIS_SET.has(part)
        ? <em key={`${keyPrefix}-${i}`} className="about-emphasis">{part}</em>
        : <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
    ));
}

// The editorial About layout — rendered by Text.jsx specifically for the
// about-me.txt window (see the `name === 'about-me.txt'` branch there).
// Every other text file keeps Text.jsx's original, unmodified rendering.
//
// This component owns both the About window's one scrollable region
// (`.about-scroll-body`, the element GSAP ScrollTrigger is scoped to via
// `scroller`) and the non-scrolling `<article>` content inside it — the
// hierarchy stays exactly `#txtfile > text-window body > one scroll region`,
// nothing nested a second time.
const AboutBiography = ({ image, imageAlt }) => {
  const scrollContainerRef = useRef(null);
  const rootRef = useRef(null);
  const heroImageRef = useRef(null);

  useAboutScrollAnimations({ rootRef, scrollContainerRef, heroImageRef });

  return (
    <div
      className="scroll-body about-scroll-body"
      tabIndex={0}
      role="region"
      aria-label="About Harsh Kaushik"
      ref={scrollContainerRef}
    >
      <article className="about-page" ref={rootRef}>
        <div className="about-page-inner">
          <header className="about-hero">
            <figure className="about-media">
              <img src={image} alt={imageAlt} className="about-photo" ref={heroImageRef} />
            </figure>

            <div className="about-copy">
              <h1 className="about-name">{ABOUT_CONTENT.pageTitle}</h1>
              <p className="about-lead">{withEmphasis(ABOUT_CONTENT.intro[0], 'lead')}</p>
            </div>
          </header>

          <section className="about-section about-research" data-about-chapter="research">
            <span className="about-divider" aria-hidden="true" />
            <h2 className="about-section-title">Research</h2>
            <p className="about-research-intro">{withEmphasis(ABOUT_CONTENT.research.intro, 'research-intro')}</p>
            <ul className="about-research-cards">
              {ABOUT_CONTENT.research.cards.map((card, i) => (
                <li key={card.label} className="about-research-card">
                  <span className="about-research-card-label">{card.label}</span>
                  <p>{withEmphasis(card.text, `research-card-${i}`)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="about-section about-organizations"
            aria-labelledby="about-organizations-title"
            data-about-chapter="organizations"
          >
            <span className="about-divider" aria-hidden="true" />
            <h2 className="about-section-title" id="about-organizations-title">{ABOUT_ORGANIZATIONS.title}</h2>
            <p className="about-organizations-subtitle">{ABOUT_ORGANIZATIONS.subtitle}</p>

            <div className="about-org-marquee">
              <div className="about-org-track">
                {ABOUT_ORGANIZATIONS.logos.map((org) => (
                  <OrganizationLogo key={org.name} org={org} />
                ))}
                <div className="about-org-track-duplicate" aria-hidden="true">
                  {ABOUT_ORGANIZATIONS.logos.map((org) => (
                    <OrganizationLogo key={`${org.name}-duplicate`} org={org} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="about-section about-life" data-about-chapter="outside">
            <span className="about-divider" aria-hidden="true" />
            <h2 className="about-section-title">{ABOUT_CONTENT.outsideScreen.title}</h2>
            <div className="about-copy-group">
              {ABOUT_CONTENT.outsideScreen.paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              <p className="about-transition">{ABOUT_CONTENT.outsideScreen.transition}</p>
            </div>
          </section>

          <section
            className="about-section about-principles-section"
            aria-label="What these interests taught me"
            data-about-chapter="principles"
          >
            <ul className="about-principles">
              {ABOUT_CONTENT.principles.map((principle) => (
                <li key={principle.label} className="about-principle">
                  <strong>{principle.label}</strong>
                  <span>{principle.text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="about-section about-vision" data-about-chapter="vision">
            <span className="about-divider" aria-hidden="true" />
            <p>{withEmphasis(ABOUT_CONTENT.vision, 'vision')}</p>
          </section>

          <footer className="about-details" data-about-chapter="details">
            <dl>
              {ABOUT_CONTENT.details.map((detail) => (
                <div className="about-detail" key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </footer>
        </div>
      </article>
    </div>
  );
};

export default AboutBiography;

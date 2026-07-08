import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { ABOUT_CONTENT, ABOUT_EMPHASIS_PHRASES } from '#constants/about.js';
import { NEXAI } from '#constants/nexai.js';
import { useAboutScrollAnimations } from '#hooks/useAboutScrollAnimations.js';
import useWindowStore from '#store/window.js';

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
  const openWindow = useWindowStore((state) => state.openWindow);

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
              <p className="about-eyebrow">{ABOUT_CONTENT.eyebrow}</p>
              <h1 className="about-name">{ABOUT_CONTENT.name}</h1>
              <p className="about-lead">{withEmphasis(ABOUT_CONTENT.intro[0], 'lead')}</p>
            </div>
          </header>

          <section className="about-section about-research" data-about-chapter="research">
            <span className="about-divider" aria-hidden="true" />
            <h2 className="about-section-title">Research</h2>
            <div className="about-copy-group">
              {ABOUT_CONTENT.intro.slice(1).map((paragraph, i) => (
                <p key={i}>{withEmphasis(paragraph, `research-${i}`)}</p>
              ))}
              <button type="button" className="about-nexai-link" onClick={() => openWindow('nexai')}>
                Explore {NEXAI.name} <ArrowRight size={14} aria-hidden="true" />
              </button>
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

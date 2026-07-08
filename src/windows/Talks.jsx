import React, { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { ExternalLink, FileText, PlayCircle, Mic, ArrowLeft, Presentation } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { WindowControls } from '#components';
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import ShareButton from '#components/ShareButton.jsx';
import Button from '#components/Button.jsx';
import useWindowStore from '#store/window.js';
import { isReducedMotion } from '#utils/motion.js';
import { withEmphasis } from '#utils/emphasisText.js';
import { getTalks, getTalkById } from '#constants/talks.js';

function formatTalkDate(value) {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('MMMM D, YYYY') : value;
}

// Converts the plain-data emphasis segments from #utils/emphasisText.js
// into real JSX — kept here, not in that shared util, so the util itself
// never has to import React or know anything about rendering.
function renderWithEmphasis(text, phrases, keyPrefix) {
  const parts = withEmphasis(text, phrases, keyPrefix);
  if (typeof parts === 'string') return parts;
  return parts.map((part) => (
    part.type === 'strong'
      ? <strong key={part.key}>{part.text}</strong>
      : <React.Fragment key={part.key}>{part.text}</React.Fragment>
  ));
}

// One editorial row per plain (non-featured) talk — kept exactly as this
// file originally shipped it, for any future talk that doesn't warrant a
// full story page. Every link is only rendered when the field is actually
// present; nothing here invents a slides/video/event URL that wasn't
// supplied on the data entry.
const TalkRow = ({ talk }) => (
  <li className="talk-row">
    <div className="talk-row-date">{talk.date}</div>
    <div className="talk-row-body">
      <p className="talk-row-title">{talk.title}</p>
      <p className="talk-row-meta">
        {talk.format ? <span className="talk-row-format">{talk.format}</span> : null}
        {talk.event}
        {talk.location ? ` — ${talk.location}` : ''}
      </p>
      {talk.description ? <p className="talk-row-description">{talk.description}</p> : null}
      {Array.isArray(talk.topics) && talk.topics.length ? (
        <div className="talk-row-topics">
          {talk.topics.map((topic) => <span key={topic} className="talk-row-topic">{topic}</span>)}
        </div>
      ) : null}
      <div className="talk-row-actions">
        {talk.slidesUrl ? (
          <a href={talk.slidesUrl} target="_blank" rel="noopener noreferrer" className="talk-row-action">
            <FileText size={12} aria-hidden="true" /> Slides
          </a>
        ) : null}
        {talk.videoUrl ? (
          <a href={talk.videoUrl} target="_blank" rel="noopener noreferrer" className="talk-row-action">
            <PlayCircle size={12} aria-hidden="true" /> Video
          </a>
        ) : null}
        {talk.eventUrl ? (
          <a href={talk.eventUrl} target="_blank" rel="noopener noreferrer" className="talk-row-action">
            <ExternalLink size={12} aria-hidden="true" /> Event
          </a>
        ) : null}
      </div>
    </div>
  </li>
);

// The featured list preview — event label, feature title, format/venue,
// a short excerpt (the opening question, falling back to the first
// introduction sentence), one cover image, and two actions: open the full
// story in place, or jump straight to the external slides.
const FeaturedTalkPreview = ({ talk, onOpen }) => {
  const excerpt = talk.openingQuestion || talk.introduction?.[0] || '';

  return (
    <li className="talks-featured-item">
      {talk.heroImage ? (
        <button
          type="button"
          className="talks-featured-media"
          onClick={onOpen}
          aria-label={`Read the talk story: ${talk.title}`}
        >
          <img src={talk.heroImage.src} alt="" loading="lazy" draggable={false} />
        </button>
      ) : null}

      <div className="talks-featured-copy">
        <p className="talk-detail__eyebrow">{talk.eventTitle} · {talk.year}</p>
        <h3>{talk.title}</h3>
        <p className="talks-featured-meta">
          {[talk.format, talk.venue, formatTalkDate(talk.date)].filter(Boolean).join(' · ')}
        </p>
        {excerpt ? <p className="talks-featured-excerpt">{excerpt}</p> : null}

        <div className="talks-featured-actions">
          <Button variant="primary" onClick={onOpen}>
            Read the talk story
          </Button>
          {talk.presentationUrl ? (
            <a href={talk.presentationUrl} target="_blank" rel="noopener noreferrer" className="talk-row-action">
              <Presentation size={12} aria-hidden="true" /> View Presentation
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
};

// Full editorial detail view for a featured talk, rendered in place of the
// list inside the same #talks window — never a second desktop window.
// Visual order follows the requested narrative progression: back control,
// event label/title/feature title/metadata, opening question, hero,
// introduction, the "meeting" and "talk" sections, the photo gallery, the
// closing "reflection" section, then the presentation call-to-action.
const TalkDetail = ({ talk, onBack, onOpenImage }) => {
  const rootRef = useRef(null);
  const phrases = talk.emphasisPhrases ?? [];
  const [meetingSection, talkSection, reflectionSection] = talk.sections ?? [];

  useGSAP(() => {
    if (isReducedMotion()) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const hero = root.querySelector('.talk-detail__hero');
    const headings = root.querySelectorAll('.talk-detail__section-title');

    if (hero) gsap.fromTo(hero, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    if (headings.length) {
      gsap.fromTo(
        headings,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.09, delay: 0.15 },
      );
    }
    return undefined;
  }, { scope: rootRef, dependencies: [talk.id] });

  return (
    <article className="talk-detail" ref={rootRef}>
      <div className="talk-detail__inner">
        <button type="button" className="talk-detail__back" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to Talks
        </button>

        <p className="talk-detail__eyebrow">{talk.eventTitle} · {talk.year}</p>
        <h1 className="talk-detail__title">{talk.eventTitle}</h1>
        <p className="talk-detail__subtitle">{talk.title}</p>
        <p className="talk-detail__meta">
          {[talk.format, talk.organization, talk.venue].filter(Boolean).join(' · ')}
        </p>

        {talk.openingQuestion ? <p className="talk-detail__lead">{talk.openingQuestion}</p> : null}

        {talk.heroImage ? (
          <figure className="talk-detail__hero">
            <button
              type="button"
              onClick={() => onOpenImage(talk.heroImage)}
              aria-label={`View larger: ${talk.heroImage.alt}`}
            >
              <img src={talk.heroImage.src} alt={talk.heroImage.alt} loading="eager" draggable={false} />
            </button>
          </figure>
        ) : null}

        {talk.introduction?.length ? (
          <div className="talk-detail__copy">
            {talk.introduction.map((paragraph, i) => (
              <p key={i}>{renderWithEmphasis(paragraph, phrases, `intro-${i}`)}</p>
            ))}
          </div>
        ) : null}

        {meetingSection ? (
          <section className="talk-detail__section">
            <h2 className="talk-detail__section-title">{meetingSection.title}</h2>
            <div className="talk-detail__copy">
              {meetingSection.paragraphs.map((paragraph, i) => (
                <p key={i}>{renderWithEmphasis(paragraph, phrases, `${meetingSection.id}-${i}`)}</p>
              ))}
            </div>
          </section>
        ) : null}

        {talkSection ? (
          <section className="talk-detail__section">
            <h2 className="talk-detail__section-title">{talkSection.title}</h2>
            <div className="talk-detail__copy">
              {talkSection.paragraphs.map((paragraph, i) => (
                <p key={i}>{renderWithEmphasis(paragraph, phrases, `${talkSection.id}-${i}`)}</p>
              ))}
            </div>
          </section>
        ) : null}

        {talk.images?.length ? (
          <div className="talk-detail__gallery">
            {talk.images.map((image) => (
              <button
                key={image.id}
                type="button"
                className="talk-detail__gallery-item"
                onClick={() => onOpenImage(image)}
                aria-label={`View larger: ${image.alt}`}
              >
                <img src={image.src} alt={image.alt} loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        ) : null}

        {reflectionSection ? (
          <section className="talk-detail__section">
            <h2 className="talk-detail__section-title">{reflectionSection.title}</h2>
            <div className="talk-detail__copy">
              {reflectionSection.paragraphs.map((paragraph, i) => (
                <p key={i}>{renderWithEmphasis(paragraph, phrases, `${reflectionSection.id}-${i}`)}</p>
              ))}
            </div>
          </section>
        ) : null}

        {talk.presentationUrl ? (
          <section className="talk-detail__presentation">
            <h2 className="talk-detail__section-title">Presentation</h2>
            <p className="talk-detail__copy">
              View the slides used for the three-minute research talk and demonstration.
            </p>
            <Button href={talk.presentationUrl} variant="primary" icon={Presentation}>
              View Presentation <ExternalLink size={12} aria-hidden="true" />
            </Button>
          </section>
        ) : null}
      </div>
    </article>
  );
};

const Talks = () => {
  const { windows, openWindow } = useWindowStore();
  const talks = getTalks();
  const requestedTalkId = windows.talks?.data?.talkId;
  const [selectedTalkId, setSelectedTalkId] = useState(
    requestedTalkId && talks.some((t) => t.id === requestedTalkId) ? requestedTalkId : null,
  );
  const bodyRef = useRef(null);

  // Lets Spotlight (or any future caller) deep-link straight into this
  // specific talk via `openWindow("talks", { talkId: "..." })` without
  // remounting the window — the same `data.*` sync pattern Photos and
  // Letterboxd already use for their own internal sections.
  useEffect(() => {
    if (requestedTalkId && talks.some((t) => t.id === requestedTalkId)) {
      setSelectedTalkId(requestedTalkId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTalkId]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [selectedTalkId]);

  const selectedTalk = selectedTalkId ? getTalkById(selectedTalkId) : null;

  const openImageInViewer = (image) => {
    openWindow('imgfile', { name: image.alt, imageUrl: image.src });
  };

  return (
    <>
      <div id="window-header">
        <WindowControls target="talks" />
        <h2 className="flex-1 text-center font-bold text-sm">Talks</h2>
        <ShareButton destination={{ app: 'talks' }} className="icon" label="Share Talks" />
      </div>

      <div className="talks-body" ref={bodyRef}>
        {selectedTalk ? (
          <TalkDetail talk={selectedTalk} onBack={() => setSelectedTalkId(null)} onOpenImage={openImageInViewer} />
        ) : talks.length ? (
          <>
            {/* Honest about volume — "Talks, presentations, and research
                demonstrations I've given" (plural, no count) previously
                implied a larger speaking archive than the one verified
                entry currently here. Scales automatically if more are
                added later rather than needing a second manual edit. */}
            <p className="talks-intro">
              {talks.length === 1
                ? 'One featured talk, presented to an industry audience.'
                : `${talks.length} talks and research demonstrations I’ve given.`}
            </p>
            <ul className="talks-list">
              {talks.map((talk) => (
                talk.featured
                  ? <FeaturedTalkPreview key={talk.id} talk={talk} onOpen={() => setSelectedTalkId(talk.id)} />
                  : <TalkRow key={talk.id} talk={talk} />
              ))}
            </ul>
          </>
        ) : (
          <div className="talks-empty">
            <Mic size={22} aria-hidden="true" className="talks-empty-icon" />
            <p>Talks, presentations, and research demonstrations will appear here.</p>
          </div>
        )}
      </div>
    </>
  );
};

const TalksWindow = WindowWrapper(Talks, 'talks');
export default TalksWindow;

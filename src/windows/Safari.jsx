import React, { useState } from 'react'
import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWarpper";
import { ArrowLeft, Clock, Mic } from 'lucide-react';
import useWindowStore from '#store/window';
import { getTalkById } from '#constants/talks.js';
import { getFieldNotes, getFieldNoteById } from '#constants/fieldNotes.js';
import ShareButton from '#components/ShareButton.jsx';

// There is no verified original writing beyond this one thesis-journey
// post yet — the "more field notes coming soon" note below is honest
// about that, plus a real link to the NSERC talk, rather than padding the
// list with invented posts.
const FEATURED_TALK_ID = 'nserc-industry-advisory-board-2026';

function fieldNoteImageUrl(file) {
  return `${import.meta.env.BASE_URL}images/field-notes/thesis/${encodeURIComponent(file)}`;
}

// A real photo in its frame, with an optional caption underneath — used
// for the hero (top of the article), each inline figure in the body, and
// (at `size="card"`) as the list view's thumbnail, reusing the same hero
// image rather than a separate asset. `width`/`height` are the real
// optimized-file dimensions (see src/constants/fieldNotes.js), so the
// browser reserves the correct box before the image finishes loading —
// no layout shift once it arrives.
function FieldNoteImage({ image, size = 'inline', eager = false }) {
  if (!image) return null;
  return (
    <figure className={`field-notes-image field-notes-image--${size}`}>
      <div className="field-notes-image-frame">
        <img
          src={fieldNoteImageUrl(image.file)}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
        />
      </div>
      {image.caption && size !== 'card' ? (
        <figcaption className="field-notes-image-caption">{image.caption}</figcaption>
      ) : null}
    </figure>
  );
}

function TagList({ tags }) {
  return (
    <ul className="field-notes-tags">
      {tags.map((tag) => <li key={tag} className="field-notes-tag">{tag}</li>)}
    </ul>
  );
}

function NoteMeta({ note }) {
  return (
    <p className="field-notes-meta">
      <span>{note.date}</span>
      <span aria-hidden="true">·</span>
      <span className="field-notes-meta__reading-time">
        <Clock size={12} aria-hidden="true" />
        {note.readingTime}
      </span>
    </p>
  );
}

const Safari = () => {
  const { windows, openWindow } = useWindowStore();
  const requestedNoteId = windows.safari?.data?.noteId ?? null;
  const [activeNoteId, setActiveNoteId] = useState(requestedNoteId);
  const [syncedRequestedNoteId, setSyncedRequestedNoteId] = useState(requestedNoteId);

  // Lets a Spotlight result (or any other deep link) jump straight into an
  // article even if the window is already open on the list or a different
  // post — mirrors how Publications/Talks/GitHub read their own
  // `windows.<key>.data` for the same purpose. Adjusted during render
  // (guarded by the synced-copy comparison) rather than in an effect, same
  // convention the codebase already uses elsewhere for this exact "derive
  // state from a prop that can change externally" case.
  if (requestedNoteId !== syncedRequestedNoteId) {
    setSyncedRequestedNoteId(requestedNoteId);
    if (requestedNoteId) setActiveNoteId(requestedNoteId);
  }

  const notes = getFieldNotes();
  const activeNote = activeNoteId ? getFieldNoteById(activeNoteId) : null;
  const featuredTalk = getTalkById(FEATURED_TALK_ID);

  return (
    <>
      <div id="window-header">
        <WindowControls target="safari" />
        <h2 className="flex-1 text-center font-bold text-sm">Field Notes</h2>
        <ShareButton destination={{ app: 'safari' }} className="icon" label="Share Field Notes" />
      </div>

      <div className="field-notes">
        <div className="field-notes-scroll">
          {activeNote ? (
            <article className="field-notes-article" aria-labelledby="field-notes-article-title">
              <button type="button" className="field-notes-back" onClick={() => setActiveNoteId(null)}>
                <ArrowLeft size={14} aria-hidden="true" />
                Field Notes
              </button>

              <header className="field-notes-article-header">
                <h1 id="field-notes-article-title">{activeNote.title}</h1>
                <p className="field-notes-article-subtitle">{activeNote.subtitle}</p>
                <NoteMeta note={activeNote} />
                <TagList tags={activeNote.tags} />
              </header>

              <FieldNoteImage image={activeNote.hero} size="hero" eager />

              <div className="field-notes-article-body">
                {activeNote.sections.map((section, i) => {
                  if (section.type === 'heading') return <h2 key={i}>{section.text}</h2>;
                  if (section.type === 'image') return <FieldNoteImage key={i} image={section} />;
                  if (section.type === 'signature') {
                    return (
                      <p key={i} className="field-note-signoff">
                        {section.text}<br />
                        {section.name}
                      </p>
                    );
                  }
                  return <p key={i}>{section.text}</p>;
                })}
              </div>
            </article>
          ) : (
            <div className="field-notes-list">
              <div className="field-notes-intro">
                <h2>Field Notes</h2>
                <p>Notes on research, engineering, learning, and the small moments behind the work.</p>
              </div>

              {notes.map((note) => (
                <button
                  type="button"
                  key={note.id}
                  className="field-notes-card"
                  onClick={() => setActiveNoteId(note.id)}
                >
                  <FieldNoteImage image={note.hero} size="card" eager />
                  <div className="field-notes-card__body">
                    <TagList tags={note.tags} />
                    <h3>{note.title}</h3>
                    <p className="field-notes-card__excerpt">{note.excerpt}</p>
                    <NoteMeta note={note} />
                  </div>
                </button>
              ))}

              <div className="field-notes-more">
                <p>More field notes are coming soon.</p>
                {featuredTalk ? (
                  <button
                    type="button"
                    className="field-notes-talk-link"
                    onClick={() => openWindow('talks', { talkId: featuredTalk.id })}
                  >
                    <Mic size={14} aria-hidden="true" />
                    In the meantime, see &ldquo;{featuredTalk.title}&rdquo; in Talks
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
const SafariWindow = WindowWrapper(Safari, "safari");
export default SafariWindow;

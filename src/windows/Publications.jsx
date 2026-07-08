import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ExternalLink, GraduationCap, Copy, Check } from 'lucide-react';
import { WindowControls } from '#components';
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import ShareButton from '#components/ShareButton.jsx';
import Button from '#components/Button.jsx';
import useWindowStore from '#store/window.js';
import { getPublications, SCHOLAR_PROFILE_URL } from '#constants/publications.js';
import { formatIeeeCitation } from '#utils/formatIeeeCitation.js';

// One reference entry — numbered, hanging-indented, styled like a
// bibliography line rather than a project card. Link priority follows the
// spec exactly: title links to the canonical publisher/DOI page only when
// verified, Scholar is a secondary action, and a DOI link only appears
// when a real DOI was verified.
const PublicationEntry = ({ pub, number, isHighlighted, entryRef }) => {
  const citation = formatIeeeCitation(pub, number);
  const [copyStatus, setCopyStatus] = useState(null);
  const statusTimeoutRef = useRef(null);

  const copyCitation = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(citation.plainText);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setCopyStatus(null), 2200);
  };

  const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : null;

  return (
    <li id={`publication-${pub.id}`} ref={entryRef} className={clsx('publication-entry', isHighlighted && 'publication-highlight')}>
      <span className="publication-number">[{citation.number}]</span>
      <div className="publication-body">
        <p className="publication-line">
          {citation.authorsList.map((author, i, arr) => {
            let prefix = '';
            if (i > 0) {
              // IEEE style omits the comma before "and" for exactly two
              // authors ("A and B"), but uses an Oxford comma for three or
              // more ("A, B, and C") — a single ", and " for every "last
              // author" case would incorrectly comma-splice the two-author
              // case.
              if (i === arr.length - 1) prefix = arr.length === 2 ? ' and ' : ', and ';
              else prefix = ', ';
            }
            return (
              <React.Fragment key={`${author.text}-${i}`}>
                {prefix}
                <span className={author.isOwner ? 'publication-author-owner' : undefined}>{author.text}</span>
              </React.Fragment>
            );
          })}
          {', '}
          {pub.publisherUrl ? (
            <a href={pub.publisherUrl} target="_blank" rel="noopener noreferrer" className="publication-title-link">
              &ldquo;{citation.title},&rdquo;
            </a>
          ) : (
            <span>&ldquo;{citation.title},&rdquo;</span>
          )}
          {' in '}
          <em className="publication-venue">{citation.venueSegment}</em>
          {citation.detailsSegment ? `, ${citation.detailsSegment}` : ''}
          {citation.doiSegment ? `, ${citation.doiSegment}` : ''}
          .
        </p>

        <div className="publication-actions">
          {pub.publisherUrl ? (
            <a href={pub.publisherUrl} target="_blank" rel="noopener noreferrer" className="publication-action">
              <ExternalLink size={11} aria-hidden="true" /> Paper
            </a>
          ) : null}
          {pub.scholarUrl ? (
            <a href={pub.scholarUrl} target="_blank" rel="noopener noreferrer" className="publication-action">
              <GraduationCap size={11} aria-hidden="true" /> Scholar
            </a>
          ) : null}
          {doiUrl ? (
            <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="publication-action">
              DOI
            </a>
          ) : null}
          <button type="button" className="publication-action" onClick={copyCitation}>
            {copyStatus === 'copied' ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
            {copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? "Couldn't copy" : 'Copy IEEE citation'}
          </button>
          <ShareButton destination={{ app: 'publications' }} className="publication-action" label={`Share ${pub.title}`} />
        </div>
      </div>
    </li>
  );
};

const Publications = () => {
  const publications = getPublications();
  const targetId = useWindowStore((state) => state.windows.publications?.data?.publicationId);
  const highlightRef = useRef(null);

  // Search (Spotlight) can open Publications with a specific entry in
  // `data.publicationId` — the same deep-link convention Safari and Time
  // Machine already use — and this scrolls/highlights that one entry.
  useEffect(() => {
    if (targetId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [targetId]);

  return (
    <>
      <div id="window-header">
        <WindowControls target="publications" />
        <h2 className="flex-1 text-center font-bold text-sm">Publications</h2>
        <ShareButton destination={{ app: 'publications' }} className="icon" label="Share Publications" />
      </div>

      <div className="publications-body">
        <p className="publications-intro">
          A selection of my peer-reviewed research, listed in IEEE reference style and verified against my
          Google Scholar profile.
        </p>

        <ol className="publications-list">
          {publications.map((pub, i) => (
            <PublicationEntry
              key={pub.id}
              pub={pub}
              number={i + 1}
              isHighlighted={pub.id === targetId}
              entryRef={pub.id === targetId ? highlightRef : null}
            />
          ))}
        </ol>

        <Button href={SCHOLAR_PROFILE_URL} variant="primary" icon={GraduationCap}>
          View all on Google Scholar <ExternalLink size={12} aria-hidden="true" />
        </Button>
      </div>
    </>
  );
};

const PublicationsWindow = WindowWrapper(Publications, 'publications');
export default PublicationsWindow;

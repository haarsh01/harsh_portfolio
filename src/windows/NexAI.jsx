import React from 'react';
import { ExternalLink, Mic } from 'lucide-react';
import { WindowControls } from '#components';
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import ShareButton from '#components/ShareButton.jsx';
import NexAIEvidenceMap from '#components/NexAIEvidenceMap.jsx';
import useWindowStore from '#store/window.js';
import { NEXAI } from '#constants/nexai.js';
import { getTalkById } from '#constants/talks.js';

const NexAI = () => {
  const openWindow = useWindowStore((state) => state.openWindow);
  const relatedTalk = NEXAI.relatedTalkIds.map((id) => getTalkById(id)).filter(Boolean)[0] ?? null;

  return (
    <>
      <div id="window-header">
        <WindowControls target="nexai" />
        <h2 className="flex-1 text-center font-bold text-sm">{NEXAI.windowTitle}</h2>
        <ShareButton destination={{ app: 'nexai' }} className="icon" label="Share NexAI" />
      </div>

      <div className="nexai-app">
        <div className="nexai-content">
          <header className="nexai-hero">
            <p className="nexai-eyebrow">{NEXAI.eyebrow}</p>
            <h1>{NEXAI.name}</h1>
            <p className="nexai-hero__short">{NEXAI.shortDescription}</p>
          </header>

          <section className="nexai-section" aria-labelledby="nexai-question-heading">
            <h2 id="nexai-question-heading">The authenticity problem</h2>
            <p className="nexai-research-question">{NEXAI.researchQuestion}</p>
            {NEXAI.whyItMatters.map((paragraph, i) => (
              <p key={i} className="nexai-paragraph">{paragraph}</p>
            ))}
          </section>

          <section className="nexai-section" aria-labelledby="nexai-evidence-heading">
            <h2 id="nexai-evidence-heading">Evidence map</h2>
            <NexAIEvidenceMap evidenceCategories={NEXAI.evidenceCategories} decisionStates={NEXAI.decisionStates} />
          </section>

          <section className="nexai-section" aria-labelledby="nexai-areas-heading">
            <h2 id="nexai-areas-heading">Research areas</h2>
            <ul className="nexai-tag-list">
              {NEXAI.researchAreas.map((area) => <li key={area} className="nexai-tag">{area}</li>)}
            </ul>
          </section>

          {relatedTalk ? (
            <section className="nexai-section" aria-labelledby="nexai-talk-heading">
              <h2 id="nexai-talk-heading">Presented publicly</h2>
              <button
                type="button"
                className="nexai-talk-card"
                onClick={() => openWindow('talks', { talkId: relatedTalk.id })}
              >
                <Mic size={16} aria-hidden="true" />
                <span className="nexai-talk-card__text">
                  <span className="nexai-talk-card__title">{relatedTalk.title}</span>
                  <span className="nexai-talk-card__event">{relatedTalk.eventTitle ?? relatedTalk.event}</span>
                </span>
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            </section>
          ) : null}

          <section className="nexai-section nexai-section--footnote" aria-labelledby="nexai-status-heading">
            <h2 id="nexai-status-heading">Status</h2>
            <p className="nexai-paragraph nexai-paragraph--muted">{NEXAI.status}</p>
            <p className="nexai-paragraph nexai-paragraph--muted">{NEXAI.confidentialityNote}</p>
          </section>
        </div>
      </div>
    </>
  );
};

const NexAIWindow = WindowWrapper(NexAI, 'nexai');
export default NexAIWindow;

import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { isReducedMotion } from '#utils/motion.js';

// A restrained illustration of how the framework reasons about a single
// image — not a live classifier. Every category/decision label comes from
// `src/constants/nexai.js` (the one authoritative source); nothing here
// simulates a prediction, a confidence score, or an "AI scanning" effect.
// Descriptions are always visible (never hover-only) so the map works
// identically with a mouse, a keyboard, or a screen reader.
const NexAIEvidenceMap = ({ evidenceCategories, decisionStates }) => {
  const gridRef = useRef(null);

  useGSAP(() => {
    if (isReducedMotion() || !gridRef.current) return undefined;
    const cards = gridRef.current.querySelectorAll('.nexai-evidence-card');
    const tween = gsap.fromTo(
      cards,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.35, ease: 'power1.out', stagger: 0.04 },
    );
    return () => tween.kill();
  }, { scope: gridRef });

  return (
    <div className="nexai-evidence-map" ref={gridRef}>
      <p className="nexai-evidence-map__caption">
        A restrained illustration of how the framework reasons about a single image — not a live
        classifier. No image is uploaded or analyzed here.
      </p>

      <div className="nexai-evidence-map__question" role="note">
        <span className="nexai-evidence-map__question-label">The question</span>
        <p>Is this image human-captured, AI-generated, or manipulated?</p>
      </div>

      <ul className="nexai-evidence-map__grid" aria-label="Evidence categories the framework weighs together">
        {evidenceCategories.map((evidence) => (
          <li key={evidence.id} className="nexai-evidence-card">
            <p className="nexai-evidence-card__label">{evidence.label}</p>
            <p className="nexai-evidence-card__description">{evidence.description}</p>
          </li>
        ))}
      </ul>

      <div className="nexai-evidence-map__arrow" aria-hidden="true" />

      <div className="nexai-evidence-map__decisions">
        <span className="nexai-evidence-map__question-label">Possible decision states</span>
        <ul>
          {decisionStates.map((decision) => (
            <li key={decision.id} className="nexai-decision-badge" data-decision={decision.id}>
              {decision.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NexAIEvidenceMap;

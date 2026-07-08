import React from 'react';
import { Share2 } from 'lucide-react';
import useSystemUIStore from '#store/systemUI.js';

// The one reusable share affordance used everywhere a destination is
// shareable (window headers, Get Info, Quick Look, Spotlight's preview
// pane, Time Machine events, Photos, Safari posts) — never a bespoke
// share button per surface. Renders nothing if the caller has no valid
// destination to offer, so nothing appears "share-able" that isn't real.
const ShareButton = ({ destination, className, label = 'Share', size = 14, showLabel = false }) => {
  const openHandoff = useSystemUIStore((state) => state.openHandoff);
  if (!destination?.app) return null;

  return (
    <button
      type="button"
      className={className ?? 'share-button'}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openHandoff(destination);
      }}
    >
      <Share2 size={size} aria-hidden="true" />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
};

export default ShareButton;

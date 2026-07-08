import React from 'react'
import { WindowControls } from "#components";
import WindowWrapper from "#hoc/WindowWarpper";
import { ChevronLeft, ChevronRight, Mic, PanelLeft, Search, ShieldHalf } from 'lucide-react';
import useWindowStore from '#store/window';
import { getTalkById } from '#constants/talks.js';
import ShareButton from '#components/ShareButton.jsx';

// There is no verified original writing beyond the NSERC talk story yet —
// this renders an honest "not yet" state plus a real link to that talk,
// rather than three JavaScript Mastery tutorial articles presented as
// Harsh's own blog (which is what this window used to show — see A8).
const FEATURED_TALK_ID = 'nserc-industry-advisory-board-2026';

const Safari = () => {
  const openWindow = useWindowStore((state) => state.openWindow);
  const featuredTalk = getTalkById(FEATURED_TALK_ID);

  return (
  <>
  <div id ="window-header">
    <WindowControls target="safari"/>
    <PanelLeft className="ml-10 icon"/>
    <div className="flex items-center gap-1 ml-5">
        <ChevronLeft className="icon"/>
        <ChevronRight className="icon"/>

    </div>
    <div className="flex-1 flex-center gap-3">
        <ShieldHalf className="icon"/>

        <div className="search">
            <Search className="icon"/>
            <input
            type="text"
            placeholder="Search or enter website name"
            className="flex-1"
            disabled
            />
        </div>

    </div>

    <div className="flex items-center gap-5">
        <ShareButton destination={{ app: 'safari' }} className="icon" label="Share Field Notes" />
    </div>
  </div>

  <div className="blog">
    <h2>Field Notes</h2>
    <div className="field-notes-empty">
      <p>Research notes, reflections, and writing will appear here.</p>
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
  </>
  );
};
const SafariWindow = WindowWrapper(Safari, "safari");
export default SafariWindow;

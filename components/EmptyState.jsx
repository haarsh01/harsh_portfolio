import React from 'react';
import clsx from 'clsx';

// Consolidated honest-empty-state primitive (Phase D2). This codebase's
// standing discipline is to render a clear, truthful "nothing here yet"
// message instead of fabricating content (Photos' Memories/Places/People/
// Favorites, Letterboxd's Lists, Field Notes, GitHub's unsynced states) —
// this component gives that recurring pattern one shared shape rather than
// each window hand-rolling its own icon+message+action markup.
const EmptyState = ({ icon: Icon, message, secondaryText, action, className }) => (
  <div className={clsx('ui-empty-state', className)}>
    {Icon ? <Icon size={28} aria-hidden="true" className="ui-empty-state__icon" /> : null}
    <p className="ui-empty-state__message">{message}</p>
    {secondaryText ? <span className="ui-empty-state__secondary">{secondaryText}</span> : null}
    {action ? <div className="ui-empty-state__action">{action}</div> : null}
  </div>
);

export default EmptyState;

import React from 'react';
import clsx from 'clsx';

// Consolidated small pill-label primitive (Phase D2) — for status/metadata
// tags like GitHub's Archived/Fork badges, decision-state labels, etc.
// `tone` is a supporting accent only; the label text always carries the
// meaning on its own (never color-only).
const Badge = ({ icon: Icon, tone = 'neutral', className, children }) => (
  <span className={clsx('ui-badge', `ui-badge--${tone}`, className)}>
    {Icon ? <Icon size={10} aria-hidden="true" /> : null}
    {children}
  </span>
);

export default Badge;

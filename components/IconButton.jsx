import React from 'react';
import clsx from 'clsx';

// Consolidated icon-only "ghost circle" button (Phase D2) — replaces the 7
// near-identical `flex items-center justify-center size-* rounded-full
// text-gray-500 hover:bg-black/5` blocks independently defined across
// QuickLook, Get Info, Handoff, Activity Monitor, and others.
const IconButton = ({ icon, size = 'medium', label, className, ...rest }) => {
  const Icon = icon;
  return (
    <button
      type="button"
      className={clsx('ui-icon-button', `ui-icon-button--${size}`, className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon size={size === 'small' ? 14 : 16} aria-hidden="true" />
    </button>
  );
};

export default IconButton;

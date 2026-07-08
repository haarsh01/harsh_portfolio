import React from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import clsx from 'clsx';

// Only ever renders a real http(s) URL — never a javascript:, data:, or
// malformed value, regardless of caller. Consolidates the repeated
// `<a target="_blank" rel="noopener noreferrer">...</a>` pattern found
// independently across Safari, Contact, Publications, Talks, Letterboxd,
// GitHub, and Time Machine.
function isSafeHttpUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const ExternalLink = ({ href, showIcon = true, iconSize = 12, className, children, ...rest }) => {
  if (!isSafeHttpUrl(href)) return null;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={clsx('ui-external-link', className)} {...rest}>
      {children}
      {showIcon ? <ExternalLinkIcon size={iconSize} aria-hidden="true" /> : null}
    </a>
  );
};

export default ExternalLink;

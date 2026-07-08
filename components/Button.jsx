import React from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

// Consolidated button primitive (Phase D2) — replaces the 12+ near-duplicate
// pill-button style blocks independently authored per window (identified in
// the design-system audit: .tm-card-action, .quick-look-open,
// .about-tour-button/.welcome-tour-button, .publications-scholar-link,
// .talks-featured-primary, and GitHub's separate --gh-* button family).
// Renders a real <a> (with safe target/rel) when `href` is supplied, a real
// <button> otherwise — never a div/span pretending to be interactive.
const Button = ({
  variant = 'primary',
  size = 'medium',
  icon: Icon = null,
  iconPosition = 'before',
  loading = false,
  disabled = false,
  href = null,
  className,
  children,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const classes = clsx('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className);
  const iconNode = loading
    ? <Loader2 size={size === 'small' ? 12 : 14} aria-hidden="true" className="ui-button__spinner" />
    : (Icon ? <Icon size={size === 'small' ? 12 : 14} aria-hidden="true" /> : null);

  const content = (
    <>
      {iconPosition === 'before' ? iconNode : null}
      <span>{children}</span>
      {iconPosition === 'after' ? iconNode : null}
    </>
  );

  if (href) {
    // A disabled/loading link has no keyboard-reachable native "disabled"
    // state, so it's excluded from the tab order and marked inert instead
    // of rendering a real link that silently does nothing when activated.
    if (isDisabled) {
      return <span className={classes} aria-disabled="true">{content}</span>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} disabled={isDisabled} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
};

export default Button;

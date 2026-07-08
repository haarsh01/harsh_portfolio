import React, { useEffect, useRef, useState } from 'react';
import { Mail, Github, Linkedin, Copy, Check, Send, ExternalLink } from 'lucide-react';
import { socials, CONTACT_EMAIL } from '#constants';
import WindowWarpper from '#hoc/WindowWarpper';
import { WindowControls } from '#components';
import ShareButton from '#components/ShareButton.jsx';
import { ABOUT_CONTENT } from '#constants/about.js';

const SOCIAL_ICONS = { GitHub: Github, LinkedIn: Linkedin };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTHS = { name: 100, subject: 150, message: 4000 };

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  const email = form.email.trim();
  const subject = form.subject.trim();
  const message = form.message.trim();

  if (!name) errors.name = 'Please enter your name.';
  else if (name.length > MAX_LENGTHS.name) errors.name = `Keep your name under ${MAX_LENGTHS.name} characters.`;

  if (!email) errors.email = 'Please enter your email address.';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Please enter a valid email address.';

  if (!subject) errors.subject = 'Please enter a subject.';
  else if (subject.length > MAX_LENGTHS.subject) errors.subject = `Keep your subject under ${MAX_LENGTHS.subject} characters.`;

  if (!message) errors.message = 'Please enter a message.';
  else if (message.length > MAX_LENGTHS.message) errors.message = `Keep your message under ${MAX_LENGTHS.message} characters.`;

  return errors;
}

function buildMessageText(form) {
  return [
    form.message.trim(),
    '',
    '—',
    `From: ${form.name.trim()}`,
    `Reply to: ${form.email.trim()}`,
  ].join('\n');
}

function buildMailtoUrl(form) {
  const subject = `Portfolio message: ${form.subject.trim()}`;
  const body = buildMessageText(form);
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Shared copy-to-clipboard affordance with the same status/timeout pattern
// used by Publications' citation copy button — real feedback (Copied /
// Couldn't copy), never a silent failure.
const useCopyStatus = () => {
  const [status, setStatus] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const copy = async (text) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus(null), 2200);
  };

  return [status, copy];
};

const DirectAction = ({ icon, label, value, href, external, copyValue }) => {
  const [copyStatus, copy] = useCopyStatus();
  const Icon = icon;

  return (
    <li className="contact-action">
      <Icon size={18} aria-hidden="true" className="contact-action-icon" />
      <div className="contact-action-body">
        <p className="contact-action-label">{label}</p>
        <p className="contact-action-value">{value}</p>
      </div>
      <div className="contact-action-buttons">
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="contact-action-btn"
        >
          {external ? <ExternalLink size={13} aria-hidden="true" /> : <Send size={13} aria-hidden="true" />}
          {external ? 'Open' : 'Email'}
        </a>
        <button type="button" className="contact-action-btn" onClick={() => copy(copyValue)}>
          {copyStatus === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          {copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? "Couldn't copy" : 'Copy'}
        </button>
      </div>
    </li>
  );
};

const FIELD_CONFIG = [
  { key: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { key: 'email', label: 'Your email', type: 'email', autoComplete: 'email' },
  { key: 'subject', label: 'Subject', type: 'text', autoComplete: 'off' },
];

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [messageCopyStatus, copyMessage] = useCopyStatus();
  const [emailCopyStatus, copyEmail] = useCopyStatus();

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setStatus({ type: 'error', text: 'Please fix the highlighted fields before sending.' });
      return;
    }

    window.location.href = buildMailtoUrl(form);
    // Honest, not "Message sent" — there is no backend here. Opening the
    // visitor's own mail client is the only thing this form can actually do.
    setStatus({
      type: 'info',
      text: "Your mail application has been opened with the message prepared. If it didn't open, use \"Copy Message\" below and send it manually.",
    });
  };

  return (
    <>
      <div id="window-header">
        <WindowControls target="contact" />
        <h2 className="flex-1 text-center font-bold text-sm">Contact</h2>
        <ShareButton destination={{ app: 'contact' }} className="icon" label="Share Contact" />
      </div>

      <div className="contact-body">
        <div className="contact-identity">
          <img src="/images/adrian.jpg" alt="Harsh Kaushik" className="contact-photo" />
          <div>
            <h3 className="contact-name">{ABOUT_CONTENT.name}</h3>
            <p className="contact-role">{ABOUT_CONTENT.contactIntroduction}</p>
            <p className="contact-invite">I'd love to hear from you — reach out directly, or send a message below.</p>
          </div>
        </div>

        <ul className="contact-actions">
          <DirectAction
            icon={Mail}
            label="Email"
            value={CONTACT_EMAIL}
            href={`mailto:${CONTACT_EMAIL}`}
            copyValue={CONTACT_EMAIL}
          />
          {socials.map((social) => {
            const Icon = SOCIAL_ICONS[social.text] ?? ExternalLink;
            return (
              <DirectAction
                key={social.id}
                icon={Icon}
                label={social.text}
                value={social.link.replace(/^https?:\/\//, '')}
                href={social.link}
                external
                copyValue={social.link}
              />
            );
          })}
        </ul>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <h3 className="contact-form-title">Send a message</h3>

          {FIELD_CONFIG.map(({ key, label, type, autoComplete }) => (
            <div className="contact-field" key={key}>
              <label htmlFor={`contact-${key}`}>{label}</label>
              <input
                id={`contact-${key}`}
                type={type}
                autoComplete={autoComplete}
                value={form[key]}
                onChange={updateField(key)}
                aria-invalid={Boolean(errors[key])}
                aria-describedby={errors[key] ? `contact-${key}-error` : undefined}
              />
              {errors[key] ? (
                <p className="contact-field-error" id={`contact-${key}-error`}>{errors[key]}</p>
              ) : null}
            </div>
          ))}

          <div className="contact-field">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              rows={5}
              value={form.message}
              onChange={updateField('message')}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? 'contact-message-error' : undefined}
            />
            {errors.message ? (
              <p className="contact-field-error" id="contact-message-error">{errors.message}</p>
            ) : null}
          </div>

          <div className="contact-form-actions">
            <button type="submit" className="contact-submit">
              <Send size={14} aria-hidden="true" />
              Open in Mail
            </button>
            <button
              type="button"
              className="contact-fallback-btn"
              onClick={() => copyMessage(buildMessageText(form))}
            >
              {messageCopyStatus === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              {messageCopyStatus === 'copied' ? 'Message copied' : messageCopyStatus === 'failed' ? "Couldn't copy" : 'Copy Message'}
            </button>
            <button
              type="button"
              className="contact-fallback-btn"
              onClick={() => copyEmail(CONTACT_EMAIL)}
            >
              {emailCopyStatus === 'copied' ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
              {emailCopyStatus === 'copied' ? 'Email copied' : emailCopyStatus === 'failed' ? "Couldn't copy" : 'Copy Email'}
            </button>
          </div>

          <p className="contact-status" role="status" aria-live="polite">
            {status?.text ?? ''}
          </p>
        </form>
      </div>
    </>
  );
};
const ContactWindow = WindowWarpper(Contact, "contact");
export default ContactWindow;

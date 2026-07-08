import React, { useEffect, useRef, useState } from 'react';
import {
  Send, Square, Copy, Check, RotateCcw, Trash2, MessageCircleMore,
} from 'lucide-react';
import { WindowControls } from '#components';
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import useHarshBot from '#hooks/useHarshBot.js';
import executePortfolioAction from '#utils/executePortfolioAction.js';
import useWindowStore from '#store/window.js';

const SUGGESTED_QUESTIONS = [
  'What is NexAI?',
  "What is Harsh's education?",
  'What has Harsh published?',
  'Tell me about his work and research experience.',
  'What technologies does he use?',
  'How can I contact him?',
];

const DISCLOSURE = "HarshBot is an AI guide to Harsh's public portfolio. It answers from information published on this website and may not know anything that has not been added here.";
const PRIVACY_NOTE = 'Messages are processed to generate a response and are not stored as permanent chat memory by this portfolio.';

function SourceChips({ citations }) {
  if (!citations?.length) return null;
  return (
    <div className="harshbot-sources" role="group" aria-label="Sources for this answer">
      {citations.map((citation) => (
        <button
          key={citation.id}
          type="button"
          className="harshbot-source-chip"
          onClick={() => executePortfolioAction(citation.action)}
        >
          {citation.label}
        </button>
      ))}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      timeoutRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (permissions, insecure context) — silently
      // no-op rather than showing a confusing error for a non-essential action.
    }
  };

  return (
    <button type="button" className="harshbot-message-action" onClick={copy} aria-label="Copy response">
      {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Message({ message, isLastAssistant, isStreaming, onRetry }) {
  const isUser = message.role === 'user';
  return (
    <li className={`harshbot-message harshbot-message--${message.role}`}>
      <div className="harshbot-bubble">
        <p>
          {message.content}
          {isLastAssistant && isStreaming && message.status === 'streaming' ? (
            <span className="harshbot-cursor" aria-hidden="true" />
          ) : null}
        </p>
      </div>
      {!isUser && message.status === 'done' && message.mode === 'local' ? (
        <p className="harshbot-mode-note">Answered from Harsh&apos;s portfolio knowledge</p>
      ) : null}
      {!isUser && message.status === 'done' ? <SourceChips citations={message.citations} /> : null}
      {!isUser && (message.status === 'done' || message.status === 'error' || message.status === 'stopped') ? (
        <div className="harshbot-message-actions">
          {message.status === 'done' && message.content ? <CopyButton text={message.content} /> : null}
          {(message.status === 'error' || message.status === 'stopped') ? (
            <button type="button" className="harshbot-message-action" onClick={onRetry}>
              <RotateCcw size={12} aria-hidden="true" /> Retry
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const HarshBotApp = () => {
  const {
    messages, isStreaming, ariaStatus, backendHealth, send, stop, retryLast, clear, maxMessageChars,
  } = useHarshBot();
  const [draft, setDraft] = useState('');
  const conversationRef = useRef(null);
  const textareaRef = useRef(null);

  // Lets a future caller (e.g. a Spotlight "ask harshbot ..." deep link)
  // open this window with a prefilled question via
  // `openWindow("harshbot", { prefill: "..." })` — the same `data.*`
  // sync convention Talks/Publications/Photos already use — without ever
  // auto-submitting it; the visitor still presses Send themselves.
  // Adjusted during render, not in an effect, since this is purely
  // "reset state in response to a changed value."
  const { windows } = useWindowStore();
  const requestedPrefill = windows.harshbot?.data?.prefill;
  const [syncedPrefill, setSyncedPrefill] = useState(null);
  if (requestedPrefill && requestedPrefill !== syncedPrefill) {
    setSyncedPrefill(requestedPrefill);
    setDraft(requestedPrefill);
  }

  useEffect(() => {
    const el = conversationRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const remaining = maxMessageChars - draft.length;
  const showCounter = remaining <= 100;
  const canSend = draft.trim().length > 0 && draft.length <= maxMessageChars && !isStreaming;

  const submit = () => {
    if (!canSend) return;
    const text = draft;
    setDraft('');
    send(text);
  };

  const onKeyDown = (event) => {
    // isComposing guards IME composition (non-Latin input) so a Japanese/
    // Chinese/Korean input method's own Enter-to-confirm keystroke never
    // accidentally submits the message mid-composition.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <>
      <div id="window-header">
        <WindowControls target="harshbot" />
        <h2 className="flex-1 text-center font-bold text-sm">HarshBot — Ask About Harsh</h2>
        <button
          type="button"
          className="icon harshbot-clear-btn"
          onClick={clear}
          aria-label="Clear conversation"
          title="Clear conversation"
          disabled={!messages.length}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="harshbot-app">
        <p className="sr-only" role="status" aria-live="polite">{ariaStatus}</p>

        <div className="harshbot-identity">
          <img src="/images/harshbot.svg" alt="" className="harshbot-identity__icon" />
          <div>
            <p className="harshbot-identity__name">HarshBot</p>
            <p className="harshbot-identity__tagline">
              {backendHealth === 'local-only' ? 'Portfolio answers available' : "AI guide to Harsh's portfolio"}
            </p>
          </div>
        </div>
        <p className="harshbot-disclosure">{DISCLOSURE}</p>
        {backendHealth === 'unavailable' && import.meta.env.DEV ? (
          <p className="harshbot-dev-status" role="note">
            HarshBot API is not connected in this development environment. You can still type — questions will use whatever the server reports at request time.
          </p>
        ) : null}

        <div className="harshbot-conversation" ref={conversationRef} role="log" aria-label="Conversation with HarshBot">
          {messages.length === 0 ? (
            <div className="harshbot-welcome">
              <MessageCircleMore size={28} aria-hidden="true" className="harshbot-welcome__icon" />
              <p className="harshbot-welcome__prompt">
                Ask me about Harsh's research, education, projects, publications, talks, technical experience, or interests.
              </p>
              <div className="harshbot-suggestions">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    className="harshbot-suggestion"
                    onClick={() => send(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="harshbot-message-list">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isLastAssistant={message.id === lastAssistantId}
                  isStreaming={isStreaming}
                  onRetry={retryLast}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="harshbot-composer" data-no-drag>
          <label htmlFor="harshbot-input" className="sr-only">Ask HarshBot a question about Harsh</label>
          <textarea
            id="harshbot-input"
            ref={textareaRef}
            className="harshbot-textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, maxMessageChars))}
            onKeyDown={onKeyDown}
            placeholder="Ask about Harsh's work, research, or how to get in touch…"
            rows={2}
            maxLength={maxMessageChars}
          />
          <div className="harshbot-composer__row">
            {showCounter ? (
              <span className={`harshbot-char-counter${remaining < 0 ? ' harshbot-char-counter--over' : ''}`}>
                {remaining}
              </span>
            ) : <span />}
            {isStreaming ? (
              <button type="button" className="harshbot-send-btn harshbot-send-btn--stop" onClick={stop} aria-label="Stop generating">
                <Square size={14} aria-hidden="true" /> Stop
              </button>
            ) : (
              <button type="button" className="harshbot-send-btn" onClick={submit} disabled={!canSend} aria-label="Send message">
                <Send size={14} aria-hidden="true" /> Send
              </button>
            )}
          </div>
          <p className="harshbot-privacy-note">{PRIVACY_NOTE}</p>
        </div>
      </div>
    </>
  );
};

const HarshBotWindow = WindowWrapper(HarshBotApp, 'harshbot');
export default HarshBotWindow;

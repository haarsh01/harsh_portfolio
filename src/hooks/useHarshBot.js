import { useCallback, useEffect, useRef, useState } from 'react';
import { streamHarshBotAnswer, fetchHarshBotHealth, HarshBotClientError } from '#services/harshbotClient.js';

const MAX_MESSAGE_CHARS = 700;
const SESSION_KEY = 'harsh-portfolio-harshbot-conversation:v1';
const SESSION_ID_KEY = 'harsh-portfolio-harshbot-session-id:v1';
const MAX_HISTORY_SENT = 8;

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // corrupted JSON, storage disabled (private mode) — start clean, never throw
  }
}

function writeSession(messages) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  } catch {
    // sessionStorage unavailable — conversation simply won't survive a
    // reload this session; harmless degradation, not a crash.
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return `s-${Date.now()}`;
  }
}

function makeId() {
  return typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `m-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Maps the health endpoint's { status, llm } into the three states the UI
// actually distinguishes (Phase 9) — never a plain boolean, since
// "unavailable" and "local-only" both keep the composer usable but mean
// different things for status text and expectations.
export function deriveBackendHealth(health) {
  if (health.retrieval === 'error' || health.status === 'unavailable') return 'unavailable';
  if (health.llm === 'ready') return 'llm-ready';
  return 'local-only';
}

// Client-side conversation state for the HarshBot window — deliberately
// local to this hook (React state + sessionStorage), never a server-side
// conversation store. See api/harshbot.js for the actual request/response
// contract this talks to, and #services/harshbotClient.js for how it's
// reached.
export function useHarshBot() {
  const [messages, setMessages] = useState(readSession);
  const [isStreaming, setIsStreaming] = useState(false);
  const [ariaStatus, setAriaStatus] = useState('');
  const [backendHealth, setBackendHealth] = useState('checking');
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const sessionIdRef = useRef(null);
  if (sessionIdRef.current === null) sessionIdRef.current = getOrCreateSessionId();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    writeSession(messages);
  }, [messages]);

  // One-time, best-effort status probe purely for status text — never
  // gates whether the composer accepts input (Phase 9).
  useEffect(() => {
    const controller = new AbortController();
    fetchHarshBotHealth(controller.signal).then((health) => {
      if (mountedRef.current) setBackendHealth(deriveBackendHealth(health));
    });
    return () => controller.abort();
  }, []);

  const updateAssistantMessage = useCallback((id, updater) => {
    if (!mountedRef.current) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
  }, []);

  const send = useCallback(async (rawText) => {
    const text = rawText.trim();
    if (!text || text.length > MAX_MESSAGE_CHARS || isStreaming) return;

    const userMessage = { id: makeId(), role: 'user', content: text };
    const assistantId = makeId();
    const assistantMessage = {
      id: assistantId, role: 'assistant', content: '', citations: [], status: 'streaming', mode: null,
    };

    const historyForRequest = messages
      .filter((m) => m.status !== 'error')
      .slice(-MAX_HISTORY_SENT)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);
    setAriaStatus('Generating a response…');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const events = await streamHarshBotAnswer({
        message: text,
        history: historyForRequest,
        sessionId: sessionIdRef.current,
        signal: controller.signal,
      });

      for await (const { event, data } of events) {
        if (event === 'delta' && typeof data.text === 'string') {
          updateAssistantMessage(assistantId, (m) => ({ ...m, content: m.content + data.text }));
        } else if (event === 'citations' && Array.isArray(data.items)) {
          updateAssistantMessage(assistantId, (m) => ({ ...m, citations: data.items }));
        } else if (event === 'error') {
          updateAssistantMessage(assistantId, (m) => ({
            ...m,
            status: 'error',
            content: m.content || (typeof data.message === 'string' ? data.message : "I couldn't complete that response. Your question has been kept so you can try again."),
          }));
        } else if (event === 'done') {
          updateAssistantMessage(assistantId, (m) => ({ ...m, status: 'done', mode: typeof data.mode === 'string' ? data.mode : null }));
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        updateAssistantMessage(assistantId, (m) => ({ ...m, status: 'stopped' }));
        setAriaStatus('Response stopped.');
      } else {
        const message = error instanceof HarshBotClientError
          ? error.message
          : "HarshBot is temporarily unavailable. You can still explore Harsh's portfolio directly.";
        updateAssistantMessage(assistantId, (m) => ({ ...m, status: 'error', content: m.content || message }));
        setAriaStatus('An error occurred.');
      }
    } finally {
      if (mountedRef.current) {
        setIsStreaming(false);
        setMessages((prev) => {
          const finalMsg = prev.find((m) => m.id === assistantId);
          if (finalMsg?.status === 'done') setAriaStatus('Response complete.');
          return prev;
        });
      }
      abortRef.current = null;
    }
  }, [isStreaming, messages, updateAssistantMessage]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retryLast = useCallback(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || isStreaming) return;
    // Drop the failed assistant turn (and the user turn being retried) so
    // the retry doesn't duplicate it in history sent to the server.
    setMessages((prev) => {
      const idx = prev.lastIndexOf(lastUser);
      return idx === -1 ? prev : prev.slice(0, idx);
    });
    send(lastUser.content);
  }, [messages, isStreaming, send]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    clearSession();
    setIsStreaming(false);
    setAriaStatus('');
  }, []);

  return {
    messages, isStreaming, ariaStatus, backendHealth, send, stop, retryLast, clear, maxMessageChars: MAX_MESSAGE_CHARS,
  };
}

export default useHarshBot;

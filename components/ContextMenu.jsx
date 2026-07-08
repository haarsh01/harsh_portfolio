import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import useSystemUIStore from '#store/systemUI.js';

const MENU_WIDTH = 220;

// Single reusable context menu, scoped to the simulated desktop and Finder
// items (per the batch's own scope — this does not replace native context
// menus anywhere else on the site). Driven entirely by
// `useSystemUIStore().contextMenu`, so only one instance can ever be open.
const ContextMenu = () => {
  const { contextMenu, closeContextMenu } = useSystemUIStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef(null);
  const returnFocusRef = useRef(null);

  const isOpen = Boolean(contextMenu);

  useEffect(() => {
    if (!isOpen) return undefined;
    returnFocusRef.current = document.activeElement;
    setActiveIndex(0);
    const raf = requestAnimationFrame(() => {
      menuRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, contextMenu?.x, contextMenu?.y]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const close = () => {
      closeContextMenu();
      returnFocusRef.current?.focus?.();
    };

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      close();
    };

    const items = contextMenu.items.filter((item) => !item.disabled);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contextMenu]);

  useEffect(() => {
    if (!isOpen) return;
    const el = menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])')[activeIndex];
    el?.focus();
  }, [activeIndex, isOpen]);

  if (!isOpen) return null;

  const items = contextMenu.items.filter((item) => !item.disabled);
  const left = Math.min(contextMenu.x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(contextMenu.y, window.innerHeight - items.length * 34 - 24);

  const select = (item) => {
    closeContextMenu();
    returnFocusRef.current?.focus?.();
    item.onSelect?.();
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      className="context-menu"
      style={{ left: Math.max(left, 8), top: Math.max(top, 8), width: MENU_WIDTH }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      {contextMenu.items.map((item) => (
        item.separator ? (
          <div key={item.key} className="context-menu-separator" role="separator" />
        ) : (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={clsx('context-menu-item', item.destructive && 'destructive')}
            onClick={() => select(item)}
          >
            {item.icon ? <item.icon size={14} aria-hidden="true" /> : null}
            <span>{item.label}</span>
            {item.hint ? <span className="context-menu-hint">{item.hint}</span> : null}
          </button>
        )
      ))}
    </div>,
    document.body,
  );
};

export default ContextMenu;

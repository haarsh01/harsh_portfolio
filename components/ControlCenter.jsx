import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Check } from 'lucide-react';
import useSystemUIStore from '#store/systemUI.js';
import usePreferencesStore from '#store/preferences.js';
import useWidgetsStore from '#store/widgets.js';
import { ACCENT_COLORS, APPEARANCE_MODES } from '#constants/appearance.js';
import { WALLPAPERS } from '#constants/wallpapers.js';
import { playToggleSound } from '#utils/interfaceSound.js';

const SCREEN_SAVER_DELAYS = [
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 0, label: 'Never' },
];

function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={clsx('cc-toggle-row', checked && 'is-on')}
      onClick={() => { onChange(!checked); playToggleSound(); }}
    >
      <span className="cc-toggle-text">
        <span className="cc-toggle-label">{label}</span>
        {description ? <span className="cc-toggle-description">{description}</span> : null}
      </span>
      <span className="cc-switch" aria-hidden="true">
        <span className="cc-switch-thumb" />
      </span>
    </button>
  );
}

function Section({ title, children }) {
  return (
    <section className="cc-section">
      <h3 className="cc-section-title">{title}</h3>
      {children}
    </section>
  );
}

const ControlCenter = () => {
  const { activeOverlay, closeControlCenter } = useSystemUIStore();
  const isOpen = activeOverlay === 'control-center';
  const preferences = usePreferencesStore();
  const { isEditMode, toggleEditMode } = useWidgetsStore();

  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      returnFocusRef.current = document.activeElement;
      const raf = requestAnimationFrame(() => panelRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const close = () => {
      closeControlCenter();
      returnFocusRef.current?.focus?.();
    };

    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      close();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeControlCenter]);

  if (!isOpen) return null;

  const { appearance, desktop, dock, motion, sound, motionOSReduced } = preferences;

  return createPortal(
    <div
      id="control-center"
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Control Center"
      className="control-center-panel"
      tabIndex={-1}
    >
      <Section title="Appearance">
        <div className="cc-segmented" role="radiogroup" aria-label="Appearance mode">
          {APPEARANCE_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={appearance.mode === mode.id}
              className={clsx('cc-segment', appearance.mode === mode.id && 'active')}
              onClick={() => { preferences.setAppearance({ mode: mode.id }); playToggleSound(); }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="cc-field">
          <label htmlFor="cc-transparency" className="cc-field-label">
            Transparency <span className="cc-field-value">{appearance.transparency}%</span>
          </label>
          <input
            id="cc-transparency"
            type="range"
            min={40}
            max={100}
            step={5}
            value={appearance.transparency}
            disabled={appearance.reduceTransparency}
            onChange={(event) => preferences.setAppearance({ transparency: Number(event.target.value) })}
          />
        </div>

        <Toggle
          label="Reduce Transparency"
          description="Use solid, high-contrast surfaces"
          checked={appearance.reduceTransparency}
          onChange={(value) => preferences.setAppearance({ reduceTransparency: value })}
        />
        <Toggle
          label="High Contrast"
          description="Stronger borders and text contrast"
          checked={appearance.highContrast}
          onChange={(value) => preferences.setAppearance({ highContrast: value })}
        />

        <div className="cc-field">
          <p className="cc-field-label">Accent Color</p>
          <div className="cc-accent-grid" role="radiogroup" aria-label="Accent color">
            {ACCENT_COLORS.map((accent) => (
              <button
                key={accent.id}
                type="button"
                role="radio"
                aria-checked={appearance.accent === accent.id}
                aria-label={accent.label}
                title={accent.label}
                className="cc-accent-swatch"
                style={{ background: accent.value }}
                onClick={() => { preferences.setAppearance({ accent: accent.id }); playToggleSound(); }}
              >
                {appearance.accent === accent.id ? <Check size={13} aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Desktop">
        <div className="cc-field">
          <p className="cc-field-label">Wallpaper</p>
          <div className="cc-wallpaper-grid" role="radiogroup" aria-label="Wallpaper">
            {WALLPAPERS.map((wallpaper) => (
              <button
                key={wallpaper.id}
                type="button"
                role="radio"
                aria-checked={desktop.wallpaper === wallpaper.id}
                aria-label={wallpaper.label}
                title={wallpaper.label}
                className={clsx('cc-wallpaper-swatch', desktop.wallpaper === wallpaper.id && 'active')}
                style={{ backgroundImage: wallpaper.value, backgroundSize: 'cover', backgroundPosition: 'center' }}
                disabled={desktop.dynamicWallpaper}
                onClick={() => { preferences.setDesktop({ wallpaper: wallpaper.id }); playToggleSound(); }}
              />
            ))}
          </div>
        </div>

        <Toggle
          label="Dynamic Wallpaper"
          description="Change with the time of day"
          checked={desktop.dynamicWallpaper}
          onChange={() => preferences.toggleDynamicWallpaper()}
        />
        <Toggle
          label="Show Widgets"
          description="Display desktop widgets"
          checked={desktop.showWidgets}
          onChange={() => preferences.toggleShowWidgets()}
        />
        {desktop.showWidgets ? (
          <button type="button" className="cc-link-button" onClick={() => { toggleEditMode(); closeControlCenter(); }}>
            {isEditMode ? 'Done Editing Widgets' : 'Edit Widgets…'}
          </button>
        ) : null}
        <Toggle
          label="Screen Saver"
          description="Show after inactivity"
          checked={desktop.screenSaverEnabled}
          onChange={() => preferences.toggleScreenSaverEnabled()}
        />
        {desktop.screenSaverEnabled ? (
          <div className="cc-field">
            <label htmlFor="cc-screensaver-delay" className="cc-field-label">Start After</label>
            <select
              id="cc-screensaver-delay"
              className="cc-select"
              value={desktop.screenSaverDelay}
              onChange={(event) => preferences.setDesktop({ screenSaverDelay: Number(event.target.value) })}
            >
              {SCREEN_SAVER_DELAYS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        ) : null}
      </Section>

      <Section title="Dock">
        <Toggle
          label="Magnification"
          description="Icons grow near the pointer"
          checked={dock.magnification}
          onChange={() => preferences.toggleDockMagnification()}
        />
        {dock.magnification ? (
          <div className="cc-field">
            <label htmlFor="cc-magnification" className="cc-field-label">
              Magnification Amount <span className="cc-field-value">{Math.round(dock.magnificationScale * 100)}%</span>
            </label>
            <input
              id="cc-magnification"
              type="range"
              min={10}
              max={50}
              step={5}
              value={Math.round(dock.magnificationScale * 100)}
              onChange={(event) => preferences.setDock({ magnificationScale: Number(event.target.value) / 100 })}
            />
          </div>
        ) : null}
      </Section>

      <Section title="Motion">
        <Toggle
          label="Decorative Animations"
          description={motionOSReduced
            ? 'Off — your system’s Reduce Motion setting takes priority'
            : 'Window and overlay transitions'}
          checked={motion.animationsEnabled}
          onChange={() => preferences.toggleAnimationsEnabled()}
        />
      </Section>

      <Section title="Sound">
        <Toggle
          label="Interface Sounds"
          description="Soft tones for Control Center and widgets"
          checked={sound.interfaceSounds}
          onChange={() => preferences.toggleInterfaceSounds()}
        />
      </Section>
    </div>,
    document.body,
  );
};

export default ControlCenter;

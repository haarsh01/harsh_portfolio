import React, { useEffect, useRef, useState } from 'react'
import dayjs from "dayjs";
import { LayoutGrid, Info, Search, SlidersHorizontal, Moon, Sun } from 'lucide-react';
import {navLinks} from "#constants";
import useWindowStore from "#store/window.js";
import useSystemUIStore from "#store/systemUI.js";
import usePreferencesStore from "#store/preferences.js";

const Navbar = () => {
    const {openWindow} = useWindowStore();
    const {
        activeOverlay, openMissionControl, closeMissionControl, openSpotlight, closeSpotlight,
        openControlCenter, closeControlCenter,
    } = useSystemUIStore();
    const appearanceMode = usePreferencesStore((state) => state.appearance.mode);
    const setAppearance = usePreferencesStore((state) => state.setAppearance);
    const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
    const systemButtonRef = useRef(null);
    const systemMenuRef = useRef(null);
    const isMissionControlOpen = activeOverlay === "mission-control";
    const isSpotlightOpen = activeOverlay === "spotlight";
    const isControlCenterOpen = activeOverlay === "control-center";

    // Mirrors PreferencesBridge's own "auto" resolution so this button's
    // icon/label reflect what's actually on screen, not just the raw
    // "light"/"dark"/"auto" preference value.
    const [osPrefersDark, setOsPrefersDark] = useState(
        () => typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (event) => setOsPrefersDark(event.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);
    const isDarkActive = appearanceMode === "auto" ? osPrefersDark : appearanceMode === "dark";
    const toggleAppearanceMode = () => setAppearance({ mode: isDarkActive ? "light" : "dark" });

    const toggleMissionControl = () => {
        if(isMissionControlOpen){
            closeMissionControl();
        } else {
            openMissionControl();
        }
    };

    const toggleSpotlight = () => {
        if(isSpotlightOpen){
            closeSpotlight();
        } else {
            openSpotlight();
        }
    };

    const toggleControlCenter = () => {
        if(isControlCenterOpen){
            closeControlCenter();
        } else {
            openControlCenter();
        }
    };

    const openAboutPortfolio = () => {
        setIsSystemMenuOpen(false);
        openWindow("aboutPortfolio");
    };

    // Apple-menu-style dropdown: closes on outside click or Escape, exactly
    // like Spotlight's own panel.
    useEffect(() => {
        if (!isSystemMenuOpen) return undefined;

        const handlePointerDown = (event) => {
            if (systemMenuRef.current?.contains(event.target)) return;
            if (systemButtonRef.current?.contains(event.target)) return;
            setIsSystemMenuOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsSystemMenuOpen(false);
                systemButtonRef.current?.focus();
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isSystemMenuOpen]);

  return (
 <nav>
    <div>
        <span className="nav-system-menu">
            <button
                type="button"
                ref={systemButtonRef}
                className="nav-system-menu-button"
                aria-haspopup="menu"
                aria-expanded={isSystemMenuOpen}
                onClick={() => setIsSystemMenuOpen((open) => !open)}
            >
                <img src="/images/logo.svg" alt="" />
                <p className="font-bold">Harsh's Portfolio</p>
            </button>
            {isSystemMenuOpen ? (
                <div ref={systemMenuRef} role="menu" aria-label="System menu" className="nav-system-menu-panel">
                    <button type="button" role="menuitem" className="nav-system-menu-item" onClick={openAboutPortfolio}>
                        <Info size={14} aria-hidden="true" />
                        About This Portfolio
                    </button>
                </div>
            ) : null}
        </span>

        <ul>
            {navLinks.map(({id, name,type}) => (
                <li key={id} onClick={() => openWindow(type)}>
                    <p>{name}</p>
                </li>
            ))
            }
        </ul>
    </div>
    <div>
        <button
            type="button"
            className="nav-spotlight-button"
            aria-label="Spotlight Search"
            aria-pressed={isSpotlightOpen}
            title="Search (Cmd/Ctrl + Space)"
            onClick={toggleSpotlight}
        >
            <Search size={16} aria-hidden="true"/>
        </button>
        <button
            type="button"
            className="nav-mission-control-button"
            aria-label="Mission Control"
            aria-pressed={isMissionControlOpen}
            title="Mission Control"
            onClick={toggleMissionControl}
        >
            <LayoutGrid size={16} aria-hidden="true"/>
        </button>
        <button
            type="button"
            className="nav-control-center-button"
            aria-label="Control Center"
            aria-pressed={isControlCenterOpen}
            title="Control Center"
            onClick={toggleControlCenter}
        >
            <SlidersHorizontal size={16} aria-hidden="true"/>
        </button>
        <button
            type="button"
            className="nav-appearance-button"
            aria-label={isDarkActive ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-pressed={isDarkActive}
            title={isDarkActive ? "Switch to Light Mode" : "Switch to Dark Mode"}
            onClick={toggleAppearanceMode}
        >
            {isDarkActive ? <Sun size={16} aria-hidden="true"/> : <Moon size={16} aria-hidden="true"/>}
        </button>
        <time>{dayjs().format("ddd MMM D h:mm A")}</time>
    </div>
 </nav>
  )
}

export default Navbar

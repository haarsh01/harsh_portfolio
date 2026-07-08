import React, { useState } from 'react'
import gsap from "gsap";
import {
  Dock, Navbar, Welcome, Home, QuickLook, AppSwitcher, MissionControl, GetInfo, ContextMenu, Spotlight, LiveActivity,
  ControlCenter, ScreenSaver, DesktopBackground, PreferencesBridge, HandoffPanel, HandoffBootstrap, HelloIntro,
} from "#components";
import { Draggable } from "gsap/Draggable";
import { Finder, Resume, Safari, Terminal, Text, Image, Contact, Photos, Spotify, AboutPortfolio, TimeMachine, ActivityMonitor, Publications, Talks, Letterboxd, GitHub, NexAI, HarshBot } from '#windows';
import { hasSeenHelloThisSession, markHelloSeenThisSession } from '#utils/helloSession.js';


gsap.registerPlugin(Draggable);

const App = () => {
  // Local, component-scoped startup state — deliberately not in the
  // Zustand window store (it's a one-shot mount-lifetime flag, not
  // portfolio state). Flips exactly once, from false to true, then the
  // Hello overlay unmounts and the Portfolio entrance animation is cleared
  // to run. Lazily seeded from sessionStorage so a same-tab refresh doesn't
  // replay the intro a visitor already sat through a moment ago — a brand
  // new tab/session (sessionStorage cleared) still sees the full intro.
  const [introComplete, setIntroComplete] = useState(hasSeenHelloThisSession);

  const completeIntro = () => {
    markHelloSeenThisSession();
    setIntroComplete(true);
  };

  return (
   <main>
    <PreferencesBridge/>
    <DesktopBackground/>
    {!introComplete ? <HelloIntro onComplete={completeIntro} /> : null}
    <Navbar/>
    <Welcome introComplete={introComplete}/>
    <Dock/>
<Safari/>
    <Terminal/>
    <Resume/>
    <Finder/>
    <Text/>
    <Image/>
    <Contact/>
    <Photos/>
    <Spotify/>
    <AboutPortfolio/>
    <TimeMachine/>
    <ActivityMonitor/>
    <Publications/>
    <Talks/>
    <Letterboxd/>
    <GitHub/>
    <NexAI/>
    <HarshBot/>
    <Home/>
    <QuickLook/>
    <AppSwitcher/>
    <MissionControl/>
    <GetInfo/>
    <ContextMenu/>
    <Spotlight/>
    <LiveActivity/>
    <ControlCenter/>
    <ScreenSaver/>
    <HandoffPanel/>
    <HandoffBootstrap/>

   </main>
  )
}

export default App

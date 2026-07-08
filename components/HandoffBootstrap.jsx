import { useEffect, useRef } from 'react';
import { parseDestinationFromSearch } from '#utils/shareableDestinations.js';
import executePortfolioAction from '#utils/executePortfolioAction.js';

// Pure side-effect component: restores a shared/Handoff destination from
// the URL exactly once on load, then keeps listening for browser
// Back/Forward so supported destinations restore without a full reload.
// Every destination is validated against the whitelist in
// shareableDestinations.js before anything is opened — an invalid or
// unknown `app` value is silently ignored, never executed.
const HandoffBootstrap = () => {
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const destination = parseDestinationFromSearch(window.location.search);
    if (destination) executePortfolioAction({ type: 'open-destination', destination });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const destination = parseDestinationFromSearch(window.location.search);
      if (destination) executePortfolioAction({ type: 'open-destination', destination });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return null;
};

export default HandoffBootstrap;

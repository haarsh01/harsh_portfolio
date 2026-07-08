import React, { useState } from 'react';
import { ExternalLink, Music } from 'lucide-react';
import { WindowControls } from "#components";
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import { SPOTIFY_PLAYLIST } from '#constants';
import ShareButton from '#components/ShareButton.jsx';

const openPlaylistInSpotify = () => {
  window.open(SPOTIFY_PLAYLIST.publicUrl, "_blank", "noopener,noreferrer");
};

const Spotify = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <>
      <div id="window-header">
        <WindowControls target="spotify" />
        <h2 className="flex-1 text-center font-bold text-sm">Spotify</h2>
        <ShareButton destination={{ app: 'spotify' }} className="icon" label="Share Spotify" />
      </div>

      <div className="spotify-app">
        <div className="spotify-header">
          <div className="spotify-identity">
            <img src={SPOTIFY_PLAYLIST.icon} alt="Spotify" className="spotify-icon" />
            <div className="spotify-copy">
              <p className="spotify-title">{SPOTIFY_PLAYLIST.title}</p>
              <p className="spotify-description">{SPOTIFY_PLAYLIST.description}</p>
            </div>
          </div>

          <button type="button" className="spotify-external-link" onClick={openPlaylistInSpotify}>
            <ExternalLink size={14} aria-hidden="true" />
            Open in Spotify
          </button>
        </div>

        <div className="spotify-player-shell">
          {!isLoaded ? (
            <div className="spotify-loading" aria-hidden="true">
              <Music size={26} className="spotify-loading-icon" />
              <p>Loading playlist…</p>
            </div>
          ) : null}

          <iframe
            title="Harsh Kaushik's favorite Spotify playlist"
            src={SPOTIFY_PLAYLIST.embedUrl}
            className="spotify-embed"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
          />
        </div>

        <p className="spotify-fallback">
          Trouble loading the playlist?
          <button type="button" onClick={openPlaylistInSpotify}>Open it in Spotify</button>
        </p>
      </div>
    </>
  );
};

const SpotifyWindow = WindowWrapper(Spotify, "spotify");
export default SpotifyWindow;

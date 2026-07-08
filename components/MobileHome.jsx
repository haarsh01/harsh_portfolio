import React from 'react';
import { Folder, Compass } from 'lucide-react';
import { getDesktopIconItems } from '#utils/portfolioItems.js';
import { dockApps } from '#constants/index.js';
import executePortfolioAction from '#utils/executePortfolioAction.js';

// Below the mobile breakpoint, the free-floating draggable desktop (and its
// hidden-until-you-drag icons) stops making sense as an interaction model —
// this renders the same underlying data (getDesktopIconItems, the same
// model Get Info/Quick Look/Spotlight already use — nothing duplicated a
// second time) as a compact, tappable app grid instead. A curated handful
// of real Dock apps not already covered by a desktop icon (Contact, GitHub,
// Photos) round out the "primary" set; everything else stays reachable via
// the real Finder window opened from "More", never a second content model.
const EXTRA_DOCK_APP_IDS = ['contact', 'github', 'photos'];

const MobileHome = () => {
  const desktopTiles = getDesktopIconItems().map((item) => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    action: item.action,
  }));

  const dockTiles = dockApps
    .filter((app) => EXTRA_DOCK_APP_IDS.includes(app.id))
    .map((app) => ({
      id: app.id,
      name: app.name,
      icon: `/images/${app.icon}`,
      action: { type: 'open-window', windowId: app.id },
    }));

  const tiles = [...desktopTiles, ...dockTiles];

  // The hero's "Take a Tour" action isn't reachable on mobile (the
  // decorative hero itself is hidden below the mobile breakpoint — see
  // index.css — since it visually overlapped this grid otherwise), so the
  // same real action gets its own tile here instead of being lost.
  const actionTiles = [
    { id: 'tour', name: 'Take a Tour', Icon: Compass, action: { type: 'start-tour' } },
    { id: 'more', name: 'More', Icon: Folder, action: { type: 'open-window', windowId: 'finder' } },
  ];

  return (
    <div className="mobile-home" role="list" aria-label="Apps">
      {tiles.map((tile) => (
        <button
          key={tile.id}
          type="button"
          className="mobile-home-tile"
          role="listitem"
          onClick={() => executePortfolioAction(tile.action)}
        >
          <img src={tile.icon} alt="" draggable={false} />
          <span>{tile.name}</span>
        </button>
      ))}
      {actionTiles.map((tile) => {
        const Icon = tile.Icon;
        return (
          <button
            key={tile.id}
            type="button"
            className="mobile-home-tile"
            role="listitem"
            onClick={() => executePortfolioAction(tile.action)}
          >
            <Icon size={32} aria-hidden="true" />
            <span>{tile.name}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MobileHome;

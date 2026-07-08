import React, { useState } from 'react';
import { ImagePlus, ImageOff, Search } from 'lucide-react';
import { WindowControls } from "#components";
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import useWindowStore from '#store/window';
import { photosLinks, gallery } from '#constants';
import clsx from 'clsx';
import { getShareablePhotosDestination } from '#utils/shareableDestinations.js';
import ShareButton from '#components/ShareButton.jsx';
import { EmptyState } from '#components';

// Only "Library" is backed by real photos for now — the other categories are
// dummy placeholders until real per-category data exists.
const LIBRARY_TITLE = "Library";

const Photos = () => {
  const { openWindow, windows } = useWindowStore();
  const [activeCategory, setActiveCategory] = useState(LIBRARY_TITLE);
  const requestedSection = windows.photos?.data?.section;
  const [syncedRequestedSection, setSyncedRequestedSection] = useState(requestedSection);

  // Lets Help Search (or any future caller) deep-link into a specific
  // section via `openWindow("photos", { section: "favorites" })` without
  // remounting the window — adjusted during render, not in an effect,
  // since this is purely "reset state in response to a changed value."
  if (requestedSection !== syncedRequestedSection) {
    setSyncedRequestedSection(requestedSection);
    if (requestedSection) {
      const match = photosLinks.find((link) => link.title.toLowerCase() === requestedSection.toLowerCase());
      if (match) setActiveCategory(match.title);
    }
  }

  const openImage = (photo, idx) => {
    openWindow("imgfile", { name: `Photo ${idx + 1}`, imageUrl: photo.img });
  };

  const showGallery = activeCategory === LIBRARY_TITLE;

  return (
    <>
      <div id="window-header">
        <WindowControls target="photos" />
        <h2 className="flex-1 text-center font-bold text-sm">Photos</h2>
        <ShareButton destination={getShareablePhotosDestination(activeCategory)} className="icon" label={`Share ${activeCategory}`} />
        <Search className="icon" />
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="sidebar">
          <h2>Library</h2>
          <ul>
            {photosLinks.map(({ id, icon, title }) => (
              <li
                key={id}
                onClick={() => setActiveCategory(title)}
                className={clsx(title === activeCategory ? "active" : "not-active")}
              >
                <img src={icon} alt={title} />
                <p>{title}</p>
              </li>
            ))}
          </ul>
        </div>

        {showGallery ? (
          <div className="gallery flex-1">
            {/* Honest framing, not a caption on the specific photos below:
                the bio's own photography description ("skies, streets, and
                ordinary moments") is a real, verified interest, but these
                particular images are conference documentation, not that
                curated street/sky work — the two are not the same thing,
                and this intro doesn't claim otherwise. */}
            <p className="gallery-intro">
              Harsh's photography ranges from skies, streets, and ordinary moments to documenting the
              events he's part of. Library currently holds the latter; more everyday work is still to be added.
            </p>
            <ul>
              {gallery.map((photo, idx) => (
                <li key={photo.id} onClick={() => openImage(photo, idx)} className="cursor-pointer">
                  <img src={photo.img} alt={`Gallery photo ${idx + 1}`} />
                </li>
              ))}
            </ul>

            <div className="upload-placeholder">
              <ImagePlus className="icon" />
              <p>Upload coming soon — your own photos will show up here</p>
            </div>
          </div>
        ) : (
          <div className="gallery flex-1">
            <EmptyState
              icon={ImageOff}
              message={`No photos in ${activeCategory} yet`}
              secondaryText="Only Library has photos for now — check back later"
            />
          </div>
        )}
      </div>
    </>
  );
};

const PhotosWindow = WindowWrapper(Photos, "photos");
export default PhotosWindow;

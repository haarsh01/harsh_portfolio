import React, { useMemo, useState } from 'react';
import { ImageOff, Heart, Search } from 'lucide-react';
import { WindowControls, EmptyState } from "#components";
import WindowWrapper from '#hoc/WindowWarpper.jsx';
import useWindowStore from '#store/window';
import usePhotoFavoritesStore from '#store/photoFavorites.js';
import { photosLinks } from '#constants';
import { PHOTOS } from '#constants/photos.js';
import {
  groupByMonth, getAlbums, getRecents, getFavorites, getPlaces, getMemories,
} from '#utils/photoLibrary.js';
import clsx from 'clsx';
import { getShareablePhotosDestination } from '#utils/shareableDestinations.js';
import ShareButton from '#components/ShareButton.jsx';

const LIBRARY_TITLE = "Library";
const ALBUMS_TITLE = "Albums";
const MEMORIES_TITLE = "Memories";
const PLACES_TITLE = "Places";
const FAVORITES_TITLE = "Favorites";
const RECENTS_TITLE = "Recents";

// The one photo-thumbnail grid, reused by every section (Library's month
// groups, an open album/memory/place, Favorites, Recents) so there is
// exactly one place that decides how a thumbnail looks and behaves.
const PhotoGrid = ({ photos, onOpen }) => (
  <ul className="photo-grid">
    {photos.map((photo, idx) => (
      <li key={photo.id}>
        <button type="button" onClick={() => onOpen(photos, idx)} aria-label={`Open ${photo.filename ?? 'photo'}`}>
          <img
            src={photo.thumbnailSrc}
            alt={photo.alt}
            loading="lazy"
            decoding="async"
            draggable="false"
            onDragStart={(event) => event.preventDefault()}
            style={{ backgroundColor: photo.dominantTone }}
          />
        </button>
      </li>
    ))}
  </ul>
);

// An album/memory/place summary card — same shape for all three "browse a
// group, then drill in" sections.
const GroupCard = ({ id, title, count, cover, onOpen }) => (
  <li>
    <button type="button" className="album-card" onClick={() => onOpen(id)}>
      <img src={cover.thumbnailSrc} alt="" loading="lazy" decoding="async" draggable="false" style={{ backgroundColor: cover.dominantTone }} />
      <span className="album-title">{title}</span>
      <span className="album-count">{count} photo{count === 1 ? '' : 's'}</span>
    </button>
  </li>
);

const Photos = () => {
  const { openWindow, windows } = useWindowStore();
  const [activeCategory, setActiveCategory] = useState(LIBRARY_TITLE);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [selectedMemoryId, setSelectedMemoryId] = useState(null);
  const [selectedPlaceKey, setSelectedPlaceKey] = useState(null);

  const requestedSection = windows.photos?.data?.section;
  const requestedAlbum = windows.photos?.data?.album;
  const requestedKey = requestedSection ? `${requestedSection}|${requestedAlbum ?? ''}` : null;
  const [syncedRequestedKey, setSyncedRequestedKey] = useState(requestedKey);

  // Lets Help Search (or any future caller) deep-link into a specific
  // section, and optionally a specific album, via
  // `openWindow("photos", { section: "albums", album: "year-2023" })`
  // without remounting the window — adjusted during render, not in an
  // effect, since this is purely "reset state in response to a changed
  // value."
  if (requestedKey !== syncedRequestedKey) {
    setSyncedRequestedKey(requestedKey);
    if (requestedSection) {
      const match = photosLinks.find((link) => link.title.toLowerCase() === requestedSection.toLowerCase());
      if (match) {
        setActiveCategory(match.title);
        setSelectedAlbumId(match.title === ALBUMS_TITLE && requestedAlbum ? requestedAlbum : null);
        setSelectedMemoryId(null);
        setSelectedPlaceKey(null);
      }
    }
  }

  const favoriteIds = usePhotoFavoritesStore((state) => state.ids);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const monthGroups = useMemo(() => groupByMonth(PHOTOS), []);
  const albums = useMemo(() => getAlbums(PHOTOS), []);
  const recents = useMemo(() => getRecents(PHOTOS), []);
  const favorites = useMemo(() => getFavorites(PHOTOS, favoriteIdSet), [favoriteIdSet]);
  const places = useMemo(() => getPlaces(PHOTOS), []);
  const memories = useMemo(() => getMemories(PHOTOS), []);

  const selectedAlbum = selectedAlbumId ? albums.find((a) => a.id === selectedAlbumId) : null;
  const selectedMemory = selectedMemoryId ? memories.find((m) => m.id === selectedMemoryId) : null;
  const selectedPlace = selectedPlaceKey ? places.find((p) => p.key === selectedPlaceKey) : null;

  const openPhoto = (photoList, idx, contextLabel) => {
    const photo = photoList[idx];
    openWindow("imgfile", {
      name: photo.filename,
      imageUrl: photo.src,
      photos: photoList,
      index: idx,
      contextLabel,
    });
  };

  const selectCategory = (title) => {
    setActiveCategory(title);
    setSelectedAlbumId(null);
    setSelectedMemoryId(null);
    setSelectedPlaceKey(null);
  };

  let content;

  if (activeCategory === LIBRARY_TITLE) {
    content = PHOTOS.length === 0 ? (
      <EmptyState icon={ImageOff} message="No photos yet" secondaryText="Photos added to the library will show up here, grouped by when they were taken" />
    ) : (
      <div className="photo-sections">
        {monthGroups.map((group) => (
          <section key={group.key} className="photo-section">
            <h3 className="photo-section-heading">{group.label}</h3>
            {/* Navigation continues across month boundaries (like Apple
                Photos' "All Photos" view) — the grid's own list is only
                for display; Previous/Next always walks the full,
                date-ordered library, not just the visible month group. */}
            <PhotoGrid
              photos={group.photos}
              onOpen={(list, idx) => {
                const fullIndex = recents.findIndex((p) => p.id === list[idx].id);
                openPhoto(recents, fullIndex, "Library");
              }}
            />
          </section>
        ))}
      </div>
    );
  } else if (activeCategory === ALBUMS_TITLE) {
    if (selectedAlbum) {
      content = (
        <div className="photo-detail-section">
          <button type="button" className="photo-back-button" onClick={() => setSelectedAlbumId(null)}>‹ Albums</button>
          <h3 className="photo-section-heading">
            {selectedAlbum.title} <span className="photo-count">{selectedAlbum.count} photo{selectedAlbum.count === 1 ? '' : 's'}</span>
          </h3>
          <PhotoGrid photos={selectedAlbum.photos} onOpen={(list, idx) => openPhoto(list, idx, `Albums › ${selectedAlbum.title}`)} />
        </div>
      );
    } else if (albums.length === 0) {
      content = <EmptyState icon={ImageOff} message="No albums yet" secondaryText="Albums are created automatically once photos carry real date metadata" />;
    } else {
      content = (
        <ul className="album-grid">
          {albums.map((album) => (
            <GroupCard
              key={album.id}
              id={album.id}
              title={album.title}
              count={album.count}
              cover={album.coverPhoto}
              onOpen={setSelectedAlbumId}
            />
          ))}
        </ul>
      );
    }
  } else if (activeCategory === MEMORIES_TITLE) {
    if (selectedMemory) {
      content = (
        <div className="photo-detail-section">
          <button type="button" className="photo-back-button" onClick={() => setSelectedMemoryId(null)}>‹ Memories</button>
          <h3 className="photo-section-heading">{selectedMemory.title}</h3>
          <PhotoGrid photos={selectedMemory.photos} onOpen={(list, idx) => openPhoto(list, idx, `Memories › ${selectedMemory.title}`)} />
        </div>
      );
    } else if (memories.length === 0) {
      content = <EmptyState icon={ImageOff} message="Memories will appear here as the photo library grows" secondaryText="A memory is a real cluster of photos taken within a few days of each other" />;
    } else {
      content = (
        <ul className="album-grid">
          {memories.map((memory) => (
            <GroupCard
              key={memory.id}
              id={memory.id}
              title={memory.title}
              count={memory.count}
              cover={memory.coverPhoto}
              onOpen={setSelectedMemoryId}
            />
          ))}
        </ul>
      );
    }
  } else if (activeCategory === PLACES_TITLE) {
    if (selectedPlace) {
      content = (
        <div className="photo-detail-section">
          <button type="button" className="photo-back-button" onClick={() => setSelectedPlaceKey(null)}>‹ Places</button>
          <h3 className="photo-section-heading">{selectedPlace.title}</h3>
          <PhotoGrid photos={selectedPlace.photos} onOpen={(list, idx) => openPhoto(list, idx, `Places › ${selectedPlace.title}`)} />
        </div>
      );
    } else if (places.length === 0) {
      content = <EmptyState icon={ImageOff} message="No verified location metadata is available for these photos yet" />;
    } else {
      content = (
        <ul className="album-grid">
          {places.map((place) => (
            <GroupCard
              key={place.key}
              id={place.key}
              title={place.title}
              count={place.count}
              cover={place.coverPhoto}
              onOpen={setSelectedPlaceKey}
            />
          ))}
        </ul>
      );
    }
  } else if (activeCategory === FAVORITES_TITLE) {
    content = favorites.length === 0 ? (
      <EmptyState
        icon={Heart}
        message="No favorites yet"
        secondaryText="Open any photo and tap the heart to save it here — favorites are stored on this device only"
      />
    ) : (
      <PhotoGrid photos={favorites} onOpen={(list, idx) => openPhoto(list, idx, "Favorites")} />
    );
  } else if (activeCategory === RECENTS_TITLE) {
    content = recents.length === 0 ? (
      <EmptyState icon={ImageOff} message="No photos yet" />
    ) : (
      <PhotoGrid photos={recents} onOpen={(list, idx) => openPhoto(list, idx, "Recents")} />
    );
  }

  return (
    <>
      <div id="window-header">
        <WindowControls target="photos" />
        <h2 className="flex-1 text-center font-bold text-sm">Photos</h2>
        <ShareButton destination={getShareablePhotosDestination(activeCategory, selectedAlbumId)} className="icon" label={`Share ${activeCategory}`} />
        <Search className="icon" />
      </div>

      <div className="photos-app flex flex-1 min-h-0 overflow-hidden">
        <div className="sidebar">
          <h2>Library</h2>
          <ul>
            {photosLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.title === activeCategory;
              return (
                <li key={link.id}>
                  <button
                    type="button"
                    onClick={() => selectCategory(link.title)}
                    className={clsx("sidebar-link", isActive ? "active" : "not-active")}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <Icon className="sidebar-icon" aria-hidden="true" />
                    <p>{link.title}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="photos-content flex-1">
          {content}
        </div>
      </div>
    </>
  );
};

const PhotosWindow = WindowWrapper(Photos, "photos");
export default PhotosWindow;

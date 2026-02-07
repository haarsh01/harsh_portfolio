// JavaScript (React)
// src/windows/Image.jsx
import React from 'react';
import { WindowControls } from "#components";
import WindowWarpper from '#hoc/WindowWarpper.jsx';
import useWindowStore from '#store/window';

const ImageFile = () => {
  const { windows } = useWindowStore();
  const win = windows?.imgfile;
  const data = win?.data;

  if (!data) return null;

  const { name, imageUrl } = data;

  return (
    <>
      <div id="window-header">
        <WindowControls target="imgfile"/>
      </div>

      <div className="bg-white h-full flex flex-col p-4 gap-4">
        {name ? <h1 className="text-lg font-semibold">{name}</h1> : null}
        {imageUrl ? (
          <div className="flex-1 overflow-auto">
            <img
              src={imageUrl}
              alt={name || 'image-file'}
              className="max-w-full h-auto object-contain"
            />
          </div>
        ) : null}
      </div>
    </>
  );
};

const ImageWindow = WindowWarpper(ImageFile, 'imgfile');
export default ImageWindow;

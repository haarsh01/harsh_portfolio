// JavaScript (React)
// src/windows/text.jsx
import React from 'react';
import useWindowStore from '../store/window.js';
import { WindowControls } from "#components";
import WindowWarpper from '#hoc/WindowWarpper.jsx';
import AboutBiography from '#components/AboutBiography.jsx';

const Text = () => {
  const { windows } = useWindowStore();
  const win = windows?.txtfile;
  const data = win?.data;

  if (!data) return null;

  const { name, image, subtitle, description } = data;

  // about-me.txt gets the dedicated editorial biography layout; every
  // other text file (project notes, etc.) keeps the original simple
  // image + description rendering below, completely unchanged. The
  // scrollable region (and its own scroll-container ref used by
  // ScrollTrigger) lives inside AboutBiography itself.
  if (name === 'about-me.txt') {
    return (
      <>
        <div id="window-header">
          <WindowControls target="txtfile" />
          <h2>{name}</h2>
        </div>

        <AboutBiography image={image} imageAlt="Harsh Kaushik" />
      </>
    );
  }

  return (
   <>
   <div id="window-header">
    <WindowControls target="txtfile"/>
    <h2>{name}</h2>
   </div>

   <div className="scroll-body p-5 space-y-6 bg-white">
    {image ? (
        <div className="w-full flex justify-center">
            <img src={image} alt={name} className="max-w-full max-h-72 w-auto h-auto object-contain rounded" />
        </div>
    ): null}

    {subtitle ? <h3 className="text-lg font-semibold">{subtitle}</h3>: null}
    {Array.isArray(description) && description.length >0 ? (
        <div className="space-y-3 leading-relaxed text-base text-gray-800">
            {description.map((para,idx) => (
                <p key={idx}>{para}</p>
            ))}
            </div>
    ):null}


   </div>
   </>
  );
};
const TextWindow = WindowWarpper(Text, "txtfile");
export default TextWindow;

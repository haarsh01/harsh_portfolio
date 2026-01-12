import React from 'react'
import {useRef} from "react";
import{dockApps} from "#constants/index.js";
const Dock = () => {
  const dockRef = useRef(null);
  console.log('Dock component rendered, ref:', dockRef);
  return <section id="dock">
    <div ref={dockRef} className="dock-container">
      {dockApps.map(({id, name, icon, canOpen}) => (
        <div key={id} className="relative flex justify-center">
          <button 
          type="button"
          className="dock-icon"
          aria-label={name}
          >

          </button>
        </div>
      ))}

    </div>

  </section>
};

export default Dock;

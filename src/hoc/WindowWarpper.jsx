import React from 'react'
import useWindowStore from "#store/window.js";

const WindowWarpper = () => {

    const Wrapped = (props) => {
        const{focusWindow, windows} = useWindowStore();
        const{isOpen, zIndex} = windows[windowKey];
        const ref = useRef(null);


        return (<section id={windowKey} ref={ref} style={{zIndex}} className="absolute"> 
        <Component {...props} />
        </section>
        );
    };
    Wrapped.displayName = `WindowWrapper(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
};

export default WindowWarpper

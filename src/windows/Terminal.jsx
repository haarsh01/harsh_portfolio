
import WindowWarpper from "#hoc/WindowWarpper.jsx";
import React from 'react'

const Terminal = () => {
  return (
    <>
    <div id="window-header">
        <p>Window Controls</p>
        <h2>Tech Stack</h2>
    </div>

    <div className="techstack">
        <p>
            <span className="font-bold">@harsh %</span>
            show tech stack
        </p>

        <div className="label">
          <p className="w-32">Category</p>
          <p>Technologies</p>
          
        </div>
   

    </div>
    </>
  );
};

const TerminalWindow = WindowWarpper(Terminal, "terminal");

export default TerminalWindow;
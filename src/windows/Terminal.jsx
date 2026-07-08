
import { techStack } from "#constants";
import WindowWarpper from "#hoc/WindowWarpper.jsx";
import { Check } from "lucide-react";
import React, { useEffect, useRef } from 'react'
import WindowControls from "#components/WindowControls.jsx";
import useWindowStore from "#store/window";
import clsx from "clsx";


const Terminal = () => {
  const { windows } = useWindowStore();
  const targetSkill = windows.terminal?.data?.skill;
  const highlightRef = useRef(null);

  // Help Search can open Terminal with a specific technology in `data.skill`
  // (e.g. `openWindow("terminal", { skill: "React.js" })`). Terminal has no
  // real selection model, so the minimal, safe addition is: scroll that
  // category into view and give it a brief highlight.
  useEffect(() => {
    if (targetSkill && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [targetSkill]);

  const normalizedTarget = targetSkill?.toLowerCase();

  return (
    <>
    <div id="window-header">
    <WindowControls target ="terminal"/>
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
        <ul className="content">
          {techStack.map(({category, items}) => {
            const isMatch = Boolean(
              normalizedTarget && items.some((item) => item.toLowerCase().includes(normalizedTarget)),
            );
            return (
            <li
              key={category}
              ref={isMatch ? highlightRef : null}
              className={clsx("flex items-center", isMatch && "skill-highlight")}
            >
              <Check className="check" size={20}/>
              <h3>{category}</h3>
              <ul>
                {items.map((item, i)=> (
                  <li key={i}>{item}{i < items.length -1 ? "," : ""}</li>
                ))}
              </ul>

            </li>
            );
          })}

        </ul>
        <div className="footnote">
                <p>
                  <Check size={20} /> {techStack.length} of {techStack.length} stacks loaded successfully (100%)
                </p>

              </div>

    </div>
    </>
  );
};

const TerminalWindow = WindowWarpper(Terminal, "terminal");

export default TerminalWindow;
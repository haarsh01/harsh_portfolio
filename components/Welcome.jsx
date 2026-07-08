import React from 'react'
import {useRef} from "react";
import gsap from "gsap";
import {useGSAP} from "@gsap/react";
import {Compass, ArrowRight} from "lucide-react";
import useTourStore from "#store/tour.js";
import useWindowStore from "#store/window.js";
import { locations } from "#constants/index.js";
import { isReducedMotion } from "#utils/motion.js";
import Button from "#components/Button.jsx";

const WORDMARK_WEIGHTS = { min: 100, max: 900, default: 400 };

// `ariaHidden` defaults to false so plain callers get normal (unlabeled)
// accessible output — only the decorative wordmark call site opts in,
// pairing per-letter `aria-hidden` with a `aria-label` on its parent so
// assistive tech gets the whole word once instead of per letter.
const renderText = (text, className, baseWeight = 400, ariaHidden = false) => {
    return [...text].map((char, i) => (
        <span
        key={i}
        className={className}
        style={{fontVariationSettings: `'wght' ${baseWeight}`}}
        aria-hidden={ariaHidden || undefined}
        >
            {char === "" ? " " : char}

        </span>

    ));

};

// The variable-font hover effect is a restrained, decorative touch on the
// small "portfolio" wordmark only (not the primary hero statement) — gated
// on reduced motion since it fires continuously on every mousemove, unlike
// the one-shot entrance animation below.
const setupWordmarkHover = (container) => {
    if(!container || isReducedMotion()) return() => {};

    const letters = container.querySelectorAll("span");
    const{min, max, default: base} = WORDMARK_WEIGHTS;

    const animateLetter = (letter, weight, duration = 0.25) =>{
        return gsap.to(letter,{
            duration,
            ease:"power2.out",
            fontVariationSettings:`'wght' ${weight}`,
        });

    };

    const handleMouseMove = (e) =>{
        const {left} = container.getBoundingClientRect();
        const mouseX = e.clientX - left;

        letters.forEach((letter) => {
            const{left: l, width: w} = letter.getBoundingClientRect();
            const distance = Math.abs(mouseX -(l-left + w/2));
            const intensity = Math.exp(-(distance ** 2) / 2000);

            animateLetter(letter, min + (max - min) * intensity);
        });
    };

    const handleMouseLeave = () =>
        letters.forEach((letter) => animateLetter(letter, base, 0.3));
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return() => {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
    }


};



const Welcome = ({ introComplete = false }) => {
  const wordmarkRef = useRef(null);
  const { isActive: tourActive, startTour } = useTourStore();
  const openWindow = useWindowStore((state) => state.openWindow);
  const aboutTextFile = locations.about.children.find((child) => child.fileType === "txt") ?? null;

  useGSAP(() => {
   const cleanup = setupWordmarkHover(wordmarkRef.current);
   return cleanup;
  }, []);

  // Entrance animation for the "portfolio" wordmark — scoped to this
  // component, gated on `introComplete` (flips exactly once, from false to
  // true, after the Hello overlay exits — or starts already-true when the
  // intro was skipped this session), so it plays once and never reruns from
  // window focus, Zustand updates, or any unrelated state change.
  useGSAP(() => {
    const letters = wordmarkRef.current?.querySelectorAll(".portfolio-letter") ?? [];
    if (!introComplete || !letters.length) return undefined;

    if (isReducedMotion()) {
      gsap.set(letters, { opacity: 1, y: 0, filter: "blur(0px)" });
      gsap.set(wordmarkRef.current, { letterSpacing: "0em" });
      return undefined;
    }

    const tl = gsap.timeline({ delay: 0.18 });
    tl.set(wordmarkRef.current, { letterSpacing: "0.12em" })
      .to(wordmarkRef.current, { letterSpacing: "0em", duration: 0.9, ease: "power2.out" }, 0)
      .to(letters, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.045,
      }, 0);

    return () => tl.kill();
  }, [introComplete]);


  return (
    <section id="welcome">
        <p className="welcome-eyebrow">Harsh Kaushik · Researcher &amp; Engineer</p>

        <h1 className="welcome-statement">I build intelligent systems that have to earn your trust.</h1>

        <p className="welcome-support">Trustworthy AI, cybersecurity, machine learning, and product engineering.</p>

        <div className="welcome-actions">
            <Button
                variant="primary"
                className="welcome-action-primary"
                icon={ArrowRight}
                iconPosition="after"
                onClick={() => openWindow('nexai')}
            >
                Explore NexAI
            </Button>
            <Button
                variant="secondary"
                className="welcome-action-secondary"
                icon={Compass}
                disabled={tourActive}
                onClick={startTour}
            >
                {tourActive ? "Tour in progress…" : "Take a Tour"}
            </Button>
            {aboutTextFile ? (
                <Button
                    variant="ghost"
                    className="welcome-action-text"
                    onClick={() => openWindow('txtfile', aboutTextFile)}
                >
                    About Harsh
                </Button>
            ) : null}
        </div>

        <p ref={wordmarkRef} className="welcome-wordmark" aria-label="Portfolio">
            {renderText("portfolio", "portfolio-letter", 400, true)}
        </p>

    </section>


  );
}

export default Welcome

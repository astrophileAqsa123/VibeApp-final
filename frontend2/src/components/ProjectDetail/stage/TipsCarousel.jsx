import { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import { TIPS } from "../constants";
import "./TipsCarousel.css";

/** Shown while the app is generating / compiling. Rotates tips while mounted. */
export default function TipsCarousel() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="studio-tips-wrapper">
      <span className="studio-tips-kicker">
        <span className="studio-tips-spinner" />
        Generating app
      </span>
      <h2 className="studio-tips-headline">Enjoy these tips while you wait</h2>

      <div className="studio-carousel-stage">
        <button
          type="button"
          className="studio-carousel-arrow"
          onClick={() => setTipIndex((prev) => (prev === 0 ? TIPS.length - 1 : prev - 1))}
          aria-label="Previous tip"
        >
          <FiChevronLeft />
        </button>

        <div className="studio-carousel-card">
          <span className="studio-tip-icon">{TIPS[tipIndex].icon}</span>
          <h3 className="studio-tip-title">{TIPS[tipIndex].title}</h3>
          <p className="studio-tip-desc">{TIPS[tipIndex].desc}</p>
        </div>

        <button
          type="button"
          className="studio-carousel-arrow"
          onClick={() => setTipIndex((prev) => (prev + 1) % TIPS.length)}
          aria-label="Next tip"
        >
          <FiChevronRight />
        </button>
      </div>

      <div className="studio-carousel-dots">
        {TIPS.map((_, i) => (
          <span
            key={i}
            className={`studio-dot ${i === tipIndex ? "is-active" : ""}`}
            onClick={() => setTipIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

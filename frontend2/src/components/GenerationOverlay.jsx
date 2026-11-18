import { useEffect, useMemo, useState } from "react";

const STARS = [
  { id: 1, x: 18, y: 24 },
  { id: 2, x: 70, y: 18 },
  { id: 3, x: 42, y: 48 },
  { id: 4, x: 78, y: 64 },
  { id: 5, x: 24, y: 72 },
];

export default function GenerationOverlay({
  open,
  status = "generating",
  message = "Creating your Flutter app...",
  onCloseGame,
}) {
  const [gameOpen, setGameOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [activeStar, setActiveStar] = useState(3);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!open) {
      setGameOpen(false);
      setScore(0);
      setSeconds(0);
      return undefined;
    }

    const gameTimer = window.setTimeout(() => setGameOpen(true), 3000);
    const tick = window.setInterval(() => setSeconds((value) => value + 1), 1000);

    return () => {
      window.clearTimeout(gameTimer);
      window.clearInterval(tick);
    };
  }, [open]);

  const currentStar = useMemo(() => STARS[activeStar % STARS.length], [activeStar]);

  if (!open) return null;

  const closeGame = () => {
    setGameOpen(false);
    onCloseGame?.();
  };

  const tapStar = () => {
    setScore((value) => value + 1);
    setActiveStar((value) => value + 1);
  };

  return (
    <div className="generation-overlay" role="dialog" aria-modal="true" aria-label="VibeApp generation progress">
      <div className="generation-overlay-card">
        <div className="generation-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="generation-icon">✦</div>
        <p className="generation-eyebrow">VibeEngine is working</p>
        <h2>{message}</h2>
        <p className="generation-subtext">
          {status === "repairing"
            ? "We found a small code issue and are fixing it automatically."
            : "You can keep this window open while your app is being prepared."}
        </p>

        <div className="generation-status-line">
          <span className="generation-status-dot" />
          <span>
            {status === "repairing"
              ? "Automatic recovery in progress"
              : status === "building"
                ? "Preparing your app preview"
                : status === "validating"
                  ? "Checking generated Flutter code"
                  : "Creating your application"}
          </span>
          <span className="generation-elapsed">{seconds}s</span>
        </div>

        {gameOpen ? (
          <div className="mini-game-card">
            <div className="mini-game-header">
              <div>
                <span className="mini-game-kicker">Quick break</span>
                <strong>Catch the star ✨</strong>
              </div>
              <span className="mini-game-score">Score {score}</span>
            </div>

            <div className="mini-game-board">
              <button
                type="button"
                className="mini-game-star"
                style={{ left: `${currentStar.x}%`, top: `${currentStar.y}%` }}
                onClick={tapStar}
                aria-label="Catch star"
              >
                ★
              </button>
            </div>

            <button type="button" className="mini-game-close" onClick={closeGame}>
              Close mini game
            </button>
          </div>
        ) : (
          <div className="generation-wait-card">
            <span className="generation-wait-spinner" />
            <div>
              <strong>Still working</strong>
              <span>You can close this window only if you want to stop watching the progress.</span>
            </div>
            <button type="button" onClick={closeGame} className="generation-dismiss">
              Hide
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

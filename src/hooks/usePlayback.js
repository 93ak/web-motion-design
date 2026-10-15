import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

// GSAP owns playback TIMING: a tween runs a number from `from` to `duration` linearly.
// Every frame we hand that number to React as currentTime, and the engine computes
// what the composition looks like at that time. Scrubbing sets the same state, so
// playback and scrubbing can never disagree.
export default function usePlayback({ duration, loop, currentTime, setCurrentTime }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [runId, setRunId] = useState(0);

  const timeRef = useRef(currentTime);
  useEffect(() => {
    timeRef.current = currentTime;
  });

  useEffect(() => {
    if (!isPlaying) return undefined;

    let tween = null;

    const run = (from) => {
      const proxy = { t: from };
      tween = gsap.to(proxy, {
        t: duration,
        duration: Math.max(duration - from, 0.001),
        ease: "none",
        onUpdate: () => setCurrentTime(proxy.t),
        onComplete: () => {
          if (loop) {
            run(0);
          } else {
            setCurrentTime(duration);
            setIsPlaying(false);
          }
        },
      });
    };

    // Pressing play at (or past) the end starts from the beginning.
    const start = timeRef.current >= duration - 0.001 ? 0 : timeRef.current;
    run(start);

    return () => {
      if (tween) tween.kill();
    };
  }, [isPlaying, runId, duration, loop, setCurrentTime]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [setCurrentTime]);

  const replay = useCallback(() => {
    setCurrentTime(0);
    timeRef.current = 0;
    setRunId((n) => n + 1); // restarts the tween even if already playing
    setIsPlaying(true);
  }, [setCurrentTime]);

  return { isPlaying, play, pause, toggle, stop, replay };
}
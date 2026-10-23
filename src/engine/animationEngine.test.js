import { describe, it, expect } from "vitest";
import {
  DEFAULT_FPS,
  findKeyframeIndexAt,
  formatTime,
  frameToTime,
  getDisplayEnd,
  getLastKeyframeTime,
  roundTime,
  snapToFrame,
  timeToFrame,
} from "./animationEngine";

describe("frame helpers", () => {
  it("defaults to 24 fps", () => {
    expect(DEFAULT_FPS).toBe(24);
  });

  it("converts between time and frames", () => {
    expect(timeToFrame(1, 24)).toBe(24);
    expect(frameToTime(12, 24)).toBe(0.5);
  });

  it("snaps a time to the nearest frame", () => {
    expect(snapToFrame(0.51, 24)).toBe(0.5);
    expect(snapToFrame(1, 24)).toBe(1);
  });
});

describe("time helpers", () => {
  it("rounds times to milliseconds", () => {
    expect(roundTime(0.12345)).toBe(0.123);
  });

  it("finds a keyframe within the time tolerance", () => {
    const list = [{ time: 1 }, { time: 2 }];
    expect(findKeyframeIndexAt(list, 1.0004)).toBe(0);
    expect(findKeyframeIndexAt(list, 1.5)).toBe(-1);
    expect(findKeyframeIndexAt(undefined, 1)).toBe(-1);
  });

  it("expands the display range past the project duration", () => {
    const project = {
      settings: { duration: 5 },
      layers: [{ keyframes: { x: [{ time: 12 }] } }],
    };
    expect(getLastKeyframeTime(project)).toBe(12);
    expect(getDisplayEnd(project)).toBe(12);

    const short = { settings: { duration: 5 }, layers: [] };
    expect(getDisplayEnd(short)).toBe(5);
  });

  it("formats time as mm:ss.cs", () => {
    expect(formatTime(75.5)).toBe("01:15.50");
    expect(formatTime(0)).toBe("00:00.00");
  });
});
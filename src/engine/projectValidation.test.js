import { describe, it, expect } from "vitest";
import { validateProject } from "./projectValidation";
import { createDemoProject } from "../state/projectFactory";

const demo = () => JSON.parse(JSON.stringify(createDemoProject()));

describe("validateProject", () => {
  it("accepts a project that went through JSON and returns it unchanged", () => {
    const original = demo();
    const result = validateProject(JSON.parse(JSON.stringify(original)));
    expect(result.ok).toBe(true);
    expect(result.project).toEqual(original);
  });

  it("rejects things that are not projects", () => {
    for (const bad of [null, "nope", 42, []]) {
      const result = validateProject(bad);
      expect(result.ok).toBe(false);
      expect(typeof result.error).toBe("string");
    }
  });

  it("rejects an unsupported version", () => {
    const p = demo();
    p.version = 99;
    expect(validateProject(p).ok).toBe(false);
  });

  it("rejects duplicate layer ids", () => {
    const p = demo();
    p.layers[1].id = p.layers[0].id;
    expect(validateProject(p).ok).toBe(false);
  });

  it("rejects an unknown layer type", () => {
    const p = demo();
    p.layers[0].type = "hexagon";
    expect(validateProject(p).ok).toBe(false);
  });

  it("rejects two keyframes at the same time", () => {
    const p = demo();
    p.layers[0].keyframes.x.push({ time: 2, value: 1, ease: "none" });
    expect(validateProject(p).ok).toBe(false);
  });

  it("rejects out-of-range opacity and bad colours", () => {
    const a = demo();
    a.layers[0].properties.opacity = 2;
    expect(validateProject(a).ok).toBe(false);

    const b = demo();
    b.layers[0].properties.color = "pink";
    expect(validateProject(b).ok).toBe(false);
  });

  it("sorts keyframes and syncs the base value to the first keyframe", () => {
    const p = demo();
    p.layers[0].properties.x = 999;
    p.layers[0].keyframes.x = [
      { time: 2, value: 800, ease: "none" },
      { time: 0, value: 100, ease: "none" },
    ];
    const result = validateProject(p);
    expect(result.ok).toBe(true);
    expect(result.project.layers[0].keyframes.x.map((k) => k.time)).toEqual([0, 2]);
    expect(result.project.layers[0].properties.x).toBe(100);
  });

  it("defaults a missing fps to 24 and rejects an invalid one", () => {
    const missing = demo();
    delete missing.settings.fps;
    const result = validateProject(missing);
    expect(result.ok).toBe(true);
    expect(result.project.settings.fps).toBe(24);

    const bad = demo();
    bad.settings.fps = 0;
    expect(validateProject(bad).ok).toBe(false);
  });

  it("keeps the fps of older projects (e.g. 30)", () => {
    const p = demo();
    p.settings.fps = 30;
    expect(validateProject(p).project.settings.fps).toBe(30);
  });
});
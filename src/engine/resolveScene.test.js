import { describe, it, expect } from "vitest";
import { resolveScene } from "./resolveScene";
import { createDemoProject } from "../state/projectFactory";

describe("resolveScene", () => {
  it("carries the artboard settings", () => {
    const scene = resolveScene(createDemoProject(), 0);
    expect(scene).toMatchObject({ width: 1920, height: 1080, background: "#f5f2ef", time: 0 });
  });

  it("lists items back to front, in layer order", () => {
    const project = createDemoProject();
    const scene = resolveScene(project, 0);
    expect(scene.items.map((i) => i.id)).toEqual(project.layers.map((l) => l.id));
  });

  it("omits hidden layers", () => {
    const project = createDemoProject();
    project.layers[0].visible = false;
    const scene = resolveScene(project, 0);
    expect(scene.items).toHaveLength(1);
    expect(scene.items[0].id).toBe(project.layers[1].id);
  });

  it("resolves animated values at the requested time", () => {
    const project = createDemoProject();
    const [circle, text] = resolveScene(project, 1).items;
    expect(circle.transform.x).toBeCloseTo(712.5, 3); // 100 + 700 × (1 − 0.5³)
    expect(text.opacity).toBe(0); // fade-in has not started yet

    const later = resolveScene(project, 3).items;
    expect(later[0].transform.x).toBe(800);
    expect(later[1].opacity).toBe(1);
  });

  it("describes content per layer type", () => {
    const [circle, text] = resolveScene(createDemoProject(), 0).items;
    expect(circle.content).toEqual({ kind: "ellipse", width: 160, height: 160, fill: "#ff4fa3" });
    expect(text.content).toMatchObject({
      kind: "text",
      text: "Motion starts here.",
      fontSize: 96,
      fill: "#1f1f1f",
      fontWeight: 700,
    });
  });

  it("applies overrides by layer id", () => {
    const project = createDemoProject();
    const id = project.layers[0].id;
    const scene = resolveScene(project, 1, { [id]: { x: 5 } });
    expect(scene.items[0].transform.x).toBe(5);
  });

  it("is deterministic and does not mutate the project", () => {
    const project = createDemoProject();
    const before = JSON.stringify(project);
    const a = resolveScene(project, 1.25);
    const b = resolveScene(project, 1.25);
    expect(a).toEqual(b);
    expect(JSON.stringify(project)).toBe(before);
  });
});
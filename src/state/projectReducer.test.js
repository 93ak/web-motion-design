import { describe, it, expect } from "vitest";
import { projectReducer as reduce } from "./projectReducer";
import { createEmptyProject, createLayer } from "./projectFactory";
import { checkProjectInvariants } from "../engine/invariants";

function setup() {
  let project = createEmptyProject();
  const layer = createLayer("circle", project);
  project = reduce(project, { type: "ADD_LAYER", layer });
  return { project, id: layer.id };
}

// Applies actions in order and asserts the invariants hold after EVERY one.
function run(project, ...actions) {
  return actions.reduce((current, action) => {
    const next = reduce(current, action);
    expect(checkProjectInvariants(next), `after ${action.type}`).toEqual([]);
    return next;
  }, project);
}

describe("defaults", () => {
  it("new projects use 24 fps", () => {
    expect(createEmptyProject().settings.fps).toBe(24);
  });
});

describe("layers", () => {
  it("adds and deletes layers", () => {
    const { project, id } = setup();
    expect(project.layers).toHaveLength(1);
    const after = run(project, { type: "DELETE_LAYER", id });
    expect(after.layers).toHaveLength(0);
  });

  it("returns the same project when deleting an unknown layer", () => {
    const { project } = setup();
    expect(reduce(project, { type: "DELETE_LAYER", id: "nope" })).toBe(project);
  });

  it("renames layers but ignores empty names", () => {
    const { project, id } = setup();
    const renamed = run(project, { type: "RENAME_LAYER", id, name: "  Hero  " });
    expect(renamed.layers[0].name).toBe("Hero");
    expect(reduce(renamed, { type: "RENAME_LAYER", id, name: "   " })).toBe(renamed);
  });

  it("toggles visibility", () => {
    const { project, id } = setup();
    const hidden = run(project, { type: "TOGGLE_VISIBILITY", id });
    expect(hidden.layers[0].visible).toBe(false);
  });

  it("moves layers within bounds only", () => {
    const { project, id: first } = setup();
    const second = createLayer("text", project);
    const two = run(project, { type: "ADD_LAYER", layer: second });

    const moved = run(two, { type: "MOVE_LAYER", id: first, direction: 1 });
    expect(moved.layers.map((l) => l.id)).toEqual([second.id, first]);
    expect(reduce(moved, { type: "MOVE_LAYER", id: first, direction: 1 })).toBe(moved);
  });
});

describe("properties", () => {
  it("sets static properties and clamps them", () => {
    const { project, id } = setup();
    const p = run(
      project,
      { type: "SET_PROPERTY", id, prop: "color", value: "#00ff00" },
      { type: "SET_PROPERTY", id, prop: "scale", value: -2 }
    );
    expect(p.layers[0].properties.color).toBe("#00ff00");
    expect(p.layers[0].properties.scale).toBe(0);
  });

  it("returns the same project when the value does not change", () => {
    const { project, id } = setup();
    expect(reduce(project, { type: "SET_PROPERTY", id, prop: "x", value: project.layers[0].properties.x })).toBe(
      project
    );
  });

  it("refuses to change the base value of an animated property", () => {
    const { project, id } = setup();
    const animated = run(project, { type: "SET_KEYFRAME", id, prop: "x", time: 0, value: 100 });
    expect(reduce(animated, { type: "SET_PROPERTY", id, prop: "x", value: 500 })).toBe(animated);
  });
});

describe("keyframes", () => {
  it("keeps keyframes sorted and syncs the base value to the first", () => {
    const { project, id } = setup();
    const p = run(
      project,
      { type: "SET_KEYFRAME", id, prop: "x", time: 2, value: 800 },
      { type: "SET_KEYFRAME", id, prop: "x", time: 0, value: 100 }
    );
    const layer = p.layers[0];
    expect(layer.keyframes.x.map((k) => k.time)).toEqual([0, 2]);
    expect(layer.properties.x).toBe(100);
  });

  it("updates instead of duplicating when a keyframe already exists at that time", () => {
    const { project, id } = setup();
    const p = run(
      project,
      { type: "SET_KEYFRAME", id, prop: "x", time: 1, value: 10 },
      { type: "SET_KEYFRAME", id, prop: "x", time: 1.0004, value: 20 }
    );
    expect(p.layers[0].keyframes.x).toHaveLength(1);
    expect(p.layers[0].keyframes.x[0].value).toBe(20);
  });

  it("returns the same project when nothing changes", () => {
    const { project, id } = setup();
    const p = run(project, { type: "SET_KEYFRAME", id, prop: "x", time: 1, value: 10 });
    expect(reduce(p, { type: "SET_KEYFRAME", id, prop: "x", time: 1, value: 10 })).toBe(p);
  });

  it("clamps opacity keyframes to 0..1", () => {
    const { project, id } = setup();
    const p = run(project, { type: "SET_KEYFRAME", id, prop: "opacity", time: 0, value: 5 });
    expect(p.layers[0].keyframes.opacity[0].value).toBe(1);
  });

  it("rejects properties that cannot be animated", () => {
    const { project, id } = setup();
    expect(reduce(project, { type: "SET_KEYFRAME", id, prop: "color", time: 0, value: 1 })).toBe(project);
  });

  it("deleting keyframes never deletes the layer", () => {
    const { project, id } = setup();
    const p = run(
      project,
      { type: "SET_KEYFRAME", id, prop: "x", time: 0, value: 100 },
      { type: "DELETE_KEYFRAME", id, prop: "x", time: 0 }
    );
    expect(p.layers).toHaveLength(1);
    expect(p.layers[0].keyframes.x).toBeUndefined();
  });

  it("rejects moving a keyframe onto another keyframe's time", () => {
    const { project, id } = setup();
    const p = run(
      project,
      { type: "SET_KEYFRAME", id, prop: "x", time: 0, value: 100 },
      { type: "SET_KEYFRAME", id, prop: "x", time: 2, value: 800 }
    );
    const attempt = reduce(p, { type: "UPDATE_KEYFRAME", id, prop: "x", time: 0, patch: { time: 2 } });
    expect(attempt).toBe(p);
  });

  it("moves a keyframe and re-sorts", () => {
    const { project, id } = setup();
    const p = run(
      project,
      { type: "SET_KEYFRAME", id, prop: "x", time: 0, value: 100 },
      { type: "SET_KEYFRAME", id, prop: "x", time: 2, value: 800 },
      { type: "UPDATE_KEYFRAME", id, prop: "x", time: 0, patch: { time: 3 } }
    );
    expect(p.layers[0].keyframes.x.map((k) => k.time)).toEqual([2, 3]);
    expect(p.layers[0].properties.x).toBe(800); // base follows the new first keyframe
  });

  it("changes the ease of a keyframe", () => {
    const { project, id } = setup();
    const p = run(
      project,
      { type: "SET_KEYFRAME", id, prop: "x", time: 0, value: 100 },
      { type: "UPDATE_KEYFRAME", id, prop: "x", time: 0, patch: { ease: "power2.out" } }
    );
    expect(p.layers[0].keyframes.x[0].ease).toBe("power2.out");
  });
});

describe("settings", () => {
  it("accepts valid settings, including fps", () => {
    const p = run(createEmptyProject(), {
      type: "SET_SETTINGS",
      patch: { duration: 10, fps: 30, width: 1280 },
    });
    expect(p.settings).toMatchObject({ duration: 10, fps: 30, width: 1280 });
  });

  it("ignores invalid settings and returns the same project", () => {
    const p = createEmptyProject();
    expect(reduce(p, { type: "SET_SETTINGS", patch: { width: 0, duration: -3, fps: 0 } })).toBe(p);
  });

  it("does not delete keyframes when the duration shrinks below them", () => {
    const { project, id } = setup();
    const p = run(
      project,
      { type: "SET_KEYFRAME", id, prop: "x", time: 4, value: 100 },
      { type: "SET_SETTINGS", patch: { duration: 1 } }
    );
    expect(p.layers[0].keyframes.x[0].time).toBe(4);
  });
});
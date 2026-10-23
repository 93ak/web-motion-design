import { describe, it, expect } from "vitest";
import { canRedo, canUndo, createHistory, withHistory } from "./history";
import { projectReducer } from "./projectReducer";
import { createEmptyProject } from "./projectFactory";

const reducer = withHistory(projectReducer);
const start = () => createHistory(createEmptyProject());
const rename = (name, extra = {}) => ({ type: "SET_NAME", name, at: 0, ...extra });

describe("undo / redo", () => {
  it("undoes and redoes edits", () => {
    let s = start();
    s = reducer(s, rename("A"));
    s = reducer(s, rename("B"));
    expect(s.present.name).toBe("B");

    s = reducer(s, { type: "UNDO" });
    expect(s.present.name).toBe("A");
    expect(canRedo(s)).toBe(true);

    s = reducer(s, { type: "REDO" });
    expect(s.present.name).toBe("B");
    expect(canRedo(s)).toBe(false);
  });

  it("does nothing at the ends of history", () => {
    const s = start();
    expect(reducer(s, { type: "UNDO" })).toBe(s);
    expect(reducer(s, { type: "REDO" })).toBe(s);
    expect(canUndo(s)).toBe(false);
  });

  it("ignores actions that change nothing", () => {
    const s = start();
    expect(reducer(s, rename("Untitled Project"))).toBe(s);
  });

  it("clears the redo stack after a new edit", () => {
    let s = start();
    s = reducer(s, rename("A"));
    s = reducer(s, { type: "UNDO" });
    s = reducer(s, rename("C"));
    expect(canRedo(s)).toBe(false);
  });

  it("caps the history length", () => {
    let s = start();
    for (let i = 0; i < 105; i += 1) s = reducer(s, rename(`n${i}`, { at: i }));
    expect(s.past).toHaveLength(100);
  });

  it("RESET starts a fresh history", () => {
    let s = start();
    s = reducer(s, rename("A"));
    s = reducer(s, { type: "RESET", project: createEmptyProject() });
    expect(s.past).toHaveLength(0);
    expect(s.future).toHaveLength(0);
  });
});

describe("coalescing", () => {
  it("merges edits with the same key inside the window into one undo step", () => {
    let s = start();
    s = reducer(s, rename("A", { coalesceKey: "name", at: 0 }));
    s = reducer(s, rename("AB", { coalesceKey: "name", at: 400 }));
    expect(s.past).toHaveLength(1);

    s = reducer(s, { type: "UNDO" });
    expect(s.present.name).toBe("Untitled Project");
  });

  it("starts a new step after the window has passed", () => {
    let s = start();
    s = reducer(s, rename("A", { coalesceKey: "name", at: 0 }));
    s = reducer(s, rename("AB", { coalesceKey: "name", at: 1500 }));
    expect(s.past).toHaveLength(2);
  });

  it("does not merge edits with different keys", () => {
    let s = start();
    s = reducer(s, rename("A", { coalesceKey: "one", at: 0 }));
    s = reducer(s, rename("AB", { coalesceKey: "two", at: 100 }));
    expect(s.past).toHaveLength(2);
  });
});
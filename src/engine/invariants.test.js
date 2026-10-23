import { describe, it, expect } from "vitest";
import { checkProjectInvariants } from "./invariants";
import { createDemoProject } from "../state/projectFactory";

const demo = () => JSON.parse(JSON.stringify(createDemoProject()));
const mentions = (problems, text) => problems.some((p) => p.includes(text));

describe("checkProjectInvariants", () => {
  it("accepts the demo project", () => {
    expect(checkProjectInvariants(demo())).toEqual([]);
  });

  it("flags unsorted keyframes", () => {
    const p = demo();
    p.layers[0].keyframes.x.reverse();
    expect(mentions(checkProjectInvariants(p), "strictly increasing")).toBe(true);
  });

  it("flags duplicate layer ids", () => {
    const p = demo();
    p.layers[1].id = p.layers[0].id;
    expect(mentions(checkProjectInvariants(p), "duplicate layer id")).toBe(true);
  });

  it("flags a base value that differs from the first keyframe", () => {
    const p = demo();
    p.layers[0].properties.x = 5;
    expect(mentions(checkProjectInvariants(p), "differs from the first keyframe")).toBe(true);
  });

  it("flags empty keyframe lists", () => {
    const p = demo();
    p.layers[0].keyframes.y = [];
    expect(mentions(checkProjectInvariants(p), "empty")).toBe(true);
  });

  it("flags out-of-range opacity", () => {
    const p = demo();
    p.layers[0].properties.opacity = 3;
    expect(mentions(checkProjectInvariants(p), "outside 0..1")).toBe(true);
  });
});
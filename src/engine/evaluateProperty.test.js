import { describe, it, expect } from "vitest";
import { evaluateLayer, evaluateProperty } from "./evaluateProperty";

function makeLayer(keyframes = {}, properties = {}) {
  return {
    id: "layer-1",
    type: "circle",
    name: "Test",
    visible: true,
    properties: {
      x: 0, y: 0, scale: 1, rotation: 0, opacity: 1,
      width: 100, height: 100, color: "#ff0000",
      ...properties,
    },
    keyframes,
  };
}

const linear = (...pairs) => pairs.map(([time, value]) => ({ time, value, ease: "none" }));

describe("evaluateProperty", () => {
  it("returns the base value when a property has no keyframes", () => {
    expect(evaluateProperty(makeLayer({}, { x: 42 }), "x", 3)).toBe(42);
  });

  it("uses the base value before the first keyframe", () => {
    const layer = makeLayer({ x: linear([1, 100], [2, 200]) }, { x: 5 });
    expect(evaluateProperty(layer, "x", 0.5)).toBe(5);
  });

  it("returns the exact keyframe value on a keyframe", () => {
    const layer = makeLayer({ x: linear([0, 100], [2, 800]) });
    expect(evaluateProperty(layer, "x", 0)).toBe(100);
    expect(evaluateProperty(layer, "x", 2)).toBe(800);
  });

  it("interpolates linearly between keyframes", () => {
    const layer = makeLayer({ x: linear([0, 100], [2, 800]) });
});

  it("holds the final value after the last keyframe", () => {
    const layer = makeLayer({ x: linear([0, 100], [2, 800]) });
    expect(evaluateProperty(layer, "x", 99)).toBe(800);
  });

  it("holds a single keyframe's value from its time onward", () => {
    const layer = makeLayer({ x: linear([1, 50]) }, { x: 0 });
    expect(evaluateProperty(layer, "x", 0.5)).toBe(0);
    expect(evaluateProperty(layer, "x", 1)).toBe(50);
    expect(evaluateProperty(layer, "x", 9)).toBe(50);
  });

  it("applies the easing stored on the segment's START keyframe", () => {
    const layer = makeLayer({
      x: [
        { time: 0, value: 0, ease: "none" },
        { time: 1, value: 100, ease: "power2.in" },
        { time: 2, value: 200, ease: "none" },
      ],
    });
    expect(evaluateProperty(layer, "x", 0.5)).toBeCloseTo(50, 5); // linear segment
    expect(evaluateProperty(layer, "x", 1.5)).toBeCloseTo(112.5, 5); // power2.in(0.5) = 0.25
  });

  it("eases out with power2.out (fast start, slow finish)", () => {
    const layer = makeLayer({
      x: [
        { time: 0, value: 0, ease: "power2.out" },
        { time: 2, value: 100, ease: "none" },
      ],
    });
    expect(evaluateProperty(layer, "x", 1)).toBeCloseTo(87.5, 5); // power2.out(0.5) = 1 − 0.5³ = 0.875
  });

  it("falls back to linear for an unknown ease", () => {
    const layer = makeLayer({
      x: [
        { time: 0, value: 0, ease: "definitely-not-an-ease" },
        { time: 2, value: 100, ease: "none" },
      ],
    });
    expect(evaluateProperty(layer, "x", 1)).toBeCloseTo(50, 5);
  });

  it("is a pure function of time: evaluation order does not matter", () => {
    const layer = makeLayer({ x: linear([0, 0], [4, 400]) });
    const first = evaluateProperty(layer, "x", 1.5);
    evaluateProperty(layer, "x", 0.5);
    evaluateProperty(layer, "x", 3.9);
    expect(evaluateProperty(layer, "x", 1.5)).toBe(first);
  });
});

describe("evaluateLayer", () => {
  it("returns animated and static values together", () => {
    const layer = makeLayer({ x: linear([0, 0], [2, 200]) }, { y: 7 });
    const values = evaluateLayer(layer, 1);
    expect(values.x).toBeCloseTo(100, 5);
    expect(values.y).toBe(7);
    expect(values.color).toBe("#ff0000");
    expect(values.width).toBe(100);
  });

  it("applies overrides on top of animated values", () => {
    const layer = makeLayer({ x: linear([0, 0], [2, 200]) });
    const values = evaluateLayer(layer, 1, { x: 999 });
    expect(values.x).toBe(999);
    expect(values.y).toBe(0);
  });

  it("never mutates the layer", () => {
    const layer = makeLayer({ x: linear([0, 0], [2, 200]) });
    const before = JSON.stringify(layer);
    evaluateLayer(layer, 1, { x: 5 });
    expect(JSON.stringify(layer)).toBe(before);
  });
});
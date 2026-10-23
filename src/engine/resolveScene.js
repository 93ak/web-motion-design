import { evaluateLayer } from "./evaluateProperty";

// The scene is the contract between the engine and ANY renderer (DOM, Canvas 2D, WebGL).
// Every renderer must follow these rules:
//  - x / y are the CENTRE of the layer, in artboard pixels (origin top-left, y grows down).
//  - Transform: move to (x, y), then rotate (degrees, clockwise) and scale uniformly, about the centre.
//  - `items` are in paint order, back to front.
//  - opacity is 0..1.

export const TEXT_STYLE = {
  fontFamily: "Inter, system-ui, Arial, sans-serif",
  fontWeight: 700,
  lineHeight: 1.15,
};

function resolveContent(layer, v) {
  switch (layer.type) {
    case "rectangle":
      return { kind: "rect", width: v.width, height: v.height, fill: v.color };
    case "circle":
      return { kind: "ellipse", width: v.width, height: v.height, fill: v.color };
    case "text":
      return { kind: "text", text: v.text, fontSize: v.fontSize, fill: v.color, ...TEXT_STYLE };
    default:
      return null;
  }
}

// overrides: optional { [layerId]: { prop: value } } applied on top of the animated values.
export function resolveScene(project, time, overrides = null) {
  const { width, height, background } = project.settings;
  const items = [];

  for (const layer of project.layers) {
    if (!layer.visible) continue;

    const values = evaluateLayer(layer, time, overrides?.[layer.id] ?? null);
    const content = resolveContent(layer, values);
    if (!content) continue;

    items.push({
      id: layer.id,
      type: layer.type,
      name: layer.name,
      transform: { x: values.x, y: values.y, scale: values.scale, rotation: values.rotation },
      opacity: values.opacity,
      content,
    });
  }

  return { time, width, height, background, items };
}
import { createId } from "../utils/ids";
import { DEFAULT_FPS } from "../engine/animationEngine";

export const LAYER_TYPES = {
  rectangle: { label: "Rectangle", icon: "▭" },
  circle: { label: "Circle", icon: "○" },
  text: { label: "Text", icon: "T" },
};

export function createEmptyProject() {
  return {
    version: 1,
    name: "Untitled Project",
    settings: {
      width: 1920,
      height: 1080,
      duration: 5,
      fps: DEFAULT_FPS,
      background: "#f5f2ef",
      loop: false,
    },
    layers: [],
  };
}

export function createLayer(type, project) {
  const { width, height } = project.settings;
  const label = LAYER_TYPES[type].label;

  const names = new Set(project.layers.map((l) => l.name));
  let n = project.layers.filter((l) => l.type === type).length + 1;
  while (names.has(`${label} ${n}`)) n += 1;

  const common = { x: width / 2, y: height / 2, scale: 1, rotation: 0, opacity: 1 };
  const specific = {
    rectangle: { width: 400, height: 240, color: "#4f8cff" },
    circle: { width: 240, height: 240, color: "#ff4fa3" },
    text: { text: "Heading", fontSize: 120, color: "#1f1f1f" },
  }[type];

  return {
    id: createId(type),
    type,
    name: `${label} ${n}`,
    visible: true,
    properties: { ...common, ...specific },
    keyframes: {},
  };
}

// Your core use case: a pink circle moves across the canvas, then text fades in.
export function createDemoProject() {
  const project = createEmptyProject();
  project.name = "Pink Circle Demo";
  project.layers = [
    {
      id: createId("circle"),
      type: "circle",
      name: "Pink Circle",
      visible: true,
      properties: {
        x: 100, y: 540, scale: 1, rotation: 0, opacity: 1,
        width: 160, height: 160, color: "#ff4fa3",
      },
      keyframes: {
        x: [
          { time: 0, value: 100, ease: "power2.out" },
          { time: 2, value: 800, ease: "none" },
        ],
      },
    },
    {
      id: createId("text"),
      type: "text",
      name: "Heading",
      visible: true,
      properties: {
        x: 1360, y: 540, scale: 1, rotation: 0, opacity: 0,
        text: "Motion starts here.", fontSize: 96, color: "#1f1f1f",
      },
      keyframes: {
        opacity: [
          { time: 2, value: 0, ease: "power2.out" },
          { time: 3, value: 1, ease: "none" },
        ],
      },
    },
  ];
  return project;
}
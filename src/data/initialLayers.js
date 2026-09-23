import { nextId } from "../utils/id";

export const initialLayers = [
  {
    id: nextId(),
    name: "Circle",
    type: "circle",
    x: 120,
    y: 200,
    scale: 1,
    rotation: 0,
    opacity: 1,
    color: "hotpink",
  },
];
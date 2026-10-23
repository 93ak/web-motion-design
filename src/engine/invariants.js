import { ANIMATABLE_PROPERTIES, TIME_EPSILON } from "./animationEngine";

const KNOWN_TYPES = ["rectangle", "circle", "text"];

// Returns a list of problems (an empty list means the project is healthy).
// Unlike validateProject (which checks untrusted FILES), this checks that OUR OWN
// code never produces a broken project.
export function checkProjectInvariants(project) {
  const problems = [];
  const add = (message) => problems.push(message);

  if (!project || typeof project !== "object") return ["project is not an object"];
  if (project.version !== 1) add(`version is ${project.version}, expected 1`);

  const s = project.settings;
  if (!s) {
    add("settings are missing");
  } else {
    if (!Number.isInteger(s.width) || s.width < 1) add(`invalid width ${s.width}`);
    if (!Number.isInteger(s.height) || s.height < 1) add(`invalid height ${s.height}`);
    if (!Number.isFinite(s.duration) || s.duration <= 0) add(`invalid duration ${s.duration}`);
    if (!Number.isInteger(s.fps) || s.fps < 1) add(`invalid fps ${s.fps}`);
  }

  if (!Array.isArray(project.layers)) {
    add("layers is not an array");
    return problems;
  }

  const seen = new Set();
  for (const layer of project.layers) {
    const where = `layer "${layer.name}" (${layer.id})`;

    if (seen.has(layer.id)) add(`duplicate layer id ${layer.id}`);
    seen.add(layer.id);

    if (!KNOWN_TYPES.includes(layer.type)) add(`${where}: unknown type ${layer.type}`);

    const p = layer.properties ?? {};
    if (!(p.opacity >= 0 && p.opacity <= 1)) add(`${where}: base opacity ${p.opacity} is outside 0..1`);
    if (!(p.scale >= 0)) add(`${where}: base scale ${p.scale} is negative`);

    for (const prop of Object.keys(layer.keyframes ?? {})) {
      if (!ANIMATABLE_PROPERTIES.includes(prop)) {
        add(`${where}: '${prop}' cannot be animated`);
        continue;
      }
      const list = layer.keyframes[prop];
      if (!Array.isArray(list) || list.length === 0) {
        add(`${where}: keyframes.${prop} is empty or not an array (empty lists must be removed)`);
        continue;
      }

      list.forEach((k, i) => {
        if (!Number.isFinite(k.time) || k.time < 0) add(`${where}: keyframes.${prop}[${i}] has a bad time`);
        if (!Number.isFinite(k.value)) add(`${where}: keyframes.${prop}[${i}] has a bad value`);
        if (typeof k.ease !== "string") add(`${where}: keyframes.${prop}[${i}] has no ease`);
        if (prop === "opacity" && (k.value < 0 || k.value > 1)) {
          add(`${where}: opacity keyframe ${i} is outside 0..1`);
        }
        if (i > 0 && k.time - list[i - 1].time < TIME_EPSILON) {
          add(`${where}: keyframes.${prop} are not strictly increasing at index ${i}`);
        }
      });

      if (p[prop] !== list[0].value) {
        add(`${where}: base ${prop} (${p[prop]}) differs from the first keyframe (${list[0].value})`);
      }
    }
  }

  return problems;
}
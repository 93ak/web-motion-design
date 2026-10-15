import { ANIMATABLE_PROPERTIES, TIME_EPSILON } from "./animationEngine";

const LAYER_TYPES = ["rectangle", "circle", "text"];
const HEX = /^#[0-9a-fA-F]{6}$/;
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function fail(message) {
  throw new Error(message);
}

function parseSettings(raw) {
  if (!raw || typeof raw !== "object") fail("Missing 'settings' object.");
  if (!Number.isInteger(raw.width) || raw.width < 1 || raw.width > 8000)
    fail("settings.width must be a positive integer (max 8000).");
  if (!Number.isInteger(raw.height) || raw.height < 1 || raw.height > 8000)
    fail("settings.height must be a positive integer (max 8000).");
  if (!isNum(raw.duration) || raw.duration <= 0 || raw.duration > 3600)
    fail("settings.duration must be a positive number of seconds (max 3600).");
  if (raw.background !== "transparent" && !HEX.test(String(raw.background)))
    fail("settings.background must be a #rrggbb colour or 'transparent'.");
  if (typeof raw.loop !== "boolean") fail("settings.loop must be true or false.");

  return {
    width: raw.width,
    height: raw.height,
    duration: raw.duration,
    fps: 30, // fixed for v1
    background: raw.background,
    loop: raw.loop,
  };
}

function parseKeyframes(raw, label, properties) {
  const source = raw ?? {};
  if (typeof source !== "object" || Array.isArray(source))
    fail(`${label}: 'keyframes' must be an object.`);

  const keyframes = {};
  for (const prop of Object.keys(source)) {
    if (!ANIMATABLE_PROPERTIES.includes(prop))
      fail(`${label}: '${prop}' cannot be animated.`);
    const list = source[prop];
    if (!Array.isArray(list)) fail(`${label}: keyframes.${prop} must be an array.`);
    if (list.length === 0) continue;

    const cleaned = list.map((k, i) => {
      if (!k || typeof k !== "object") fail(`${label}: keyframes.${prop}[${i}] is not an object.`);
      if (!isNum(k.time) || k.time < 0)
        fail(`${label}: keyframes.${prop}[${i}].time must be a number >= 0.`);
      if (!isNum(k.value)) fail(`${label}: keyframes.${prop}[${i}].value must be a number.`);
      if (prop === "opacity" && (k.value < 0 || k.value > 1))
        fail(`${label}: opacity keyframes must be between 0 and 1.`);
      const ease = k.ease === undefined ? "none" : k.ease;
      if (typeof ease !== "string") fail(`${label}: keyframes.${prop}[${i}].ease must be a string.`);
      return { time: k.time, value: k.value, ease };
    });

    cleaned.sort((a, b) => a.time - b.time);
    for (let i = 1; i < cleaned.length; i += 1) {
      if (Math.abs(cleaned[i].time - cleaned[i - 1].time) < TIME_EPSILON)
        fail(`${label}: two '${prop}' keyframes share the time ${cleaned[i].time}.`);
    }

    keyframes[prop] = cleaned;
    properties[prop] = cleaned[0].value; // base value follows the first keyframe
  }
  return keyframes;
}

function parseLayer(raw, index, seenIds) {
  const label = `Layer ${index + 1}`;
  if (!raw || typeof raw !== "object") fail(`${label} is not an object.`);
  if (typeof raw.id !== "string" || !raw.id) fail(`${label} has no valid id.`);
  if (seenIds.has(raw.id)) fail(`Duplicate layer id "${raw.id}".`);
  seenIds.add(raw.id);
  if (!LAYER_TYPES.includes(raw.type)) fail(`${label} has unknown type "${raw.type}".`);
  if (typeof raw.name !== "string") fail(`${label} has no name.`);

  const p = raw.properties;
  if (!p || typeof p !== "object") fail(`${label} has no 'properties' object.`);
  for (const key of ["x", "y", "scale", "rotation", "opacity"]) {
    if (!isNum(p[key])) fail(`${label}: properties.${key} must be a number.`);
  }
  if (p.opacity < 0 || p.opacity > 1) fail(`${label}: opacity must be between 0 and 1.`);
  if (p.scale < 0) fail(`${label}: scale cannot be negative.`);
  if (!HEX.test(String(p.color))) fail(`${label}: properties.color must be #rrggbb.`);

  const properties = {
    x: p.x,
    y: p.y,
    scale: p.scale,
    rotation: p.rotation,
    opacity: p.opacity,
    color: p.color,
  };

  if (raw.type === "rectangle" || raw.type === "circle") {
    if (!isNum(p.width) || p.width <= 0) fail(`${label}: width must be a positive number.`);
    if (!isNum(p.height) || p.height <= 0) fail(`${label}: height must be a positive number.`);
    properties.width = p.width;
    properties.height = p.height;
  } else {
    if (typeof p.text !== "string") fail(`${label}: text must be a string.`);
    if (!isNum(p.fontSize) || p.fontSize <= 0) fail(`${label}: fontSize must be a positive number.`);
    properties.text = p.text;
    properties.fontSize = p.fontSize;
  }

  const keyframes = parseKeyframes(raw.keyframes, label, properties);

  return {
    id: raw.id,
    type: raw.type,
    name: raw.name,
    visible: raw.visible !== false,
    properties,
    keyframes,
  };
}

// Returns { ok: true, project } or { ok: false, error }. Never throws.
export function validateProject(data) {
  try {
    if (!data || typeof data !== "object" || Array.isArray(data))
      fail("The file does not contain a project object.");
    if (data.version !== 1)
      fail(`Unsupported project version: ${String(data.version)} (expected 1).`);
    if (typeof data.name !== "string") fail("The project has no name.");
    if (!Array.isArray(data.layers)) fail("The project has no 'layers' array.");

    const settings = parseSettings(data.settings);
    const seenIds = new Set();
    const layers = data.layers.map((layer, i) => parseLayer(layer, i, seenIds));

    return { ok: true, project: { version: 1, name: data.name, settings, layers } };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
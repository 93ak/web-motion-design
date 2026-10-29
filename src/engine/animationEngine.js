import gsap from "gsap";

export const DEFAULT_FPS = 24;
export const FPS_OPTIONS = [12, 15, 24, 25, 30, 48, 60];

// Frame helpers. A "frame" is a whole number; time is in seconds.
export const timeToFrame = (t, fps) => Math.round(t * fps);
export const frameToTime = (frame, fps) => frame / fps;
export const snapToFrame = (t, fps) => Math.round(t * fps) / fps;
export const TIME_EPSILON = 0.001;

export const ANIMATABLE_PROPERTIES = ["x", "y", "scale", "rotation", "opacity"];

export const PROPERTY_LABELS = {
  x: "Position X",
  y: "Position Y",
  scale: "Scale",
  rotation: "Rotation",
  opacity: "Opacity",
};

export const PROPERTY_SHORT = {
  x: "X",
  y: "Y",
  scale: "Scale",
  rotation: "Rotation",
  opacity: "Opacity",
};

export const EASE_OPTIONS = [
  { value: "none", label: "Linear" },
  { value: "power1.in", label: "Power1 In" },
  { value: "power1.out", label: "Power1 Out" },
  { value: "power1.inOut", label: "Power1 In-Out" },
  { value: "power2.in", label: "Power2 In" },
  { value: "power2.out", label: "Power2 Out" },
  { value: "power2.inOut", label: "Power2 In-Out" },
  { value: "power3.in", label: "Power3 In" },
  { value: "power3.out", label: "Power3 Out" },
  { value: "power3.inOut", label: "Power3 In-Out" },
  { value: "back.out(1.7)", label: "Back Out" },
  { value: "elastic.out(1, 0.3)", label: "Elastic Out" },
  { value: "bounce.out", label: "Bounce Out" },
];

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Keyframe times are stored with millisecond precision.
export const roundTime = (t) => Math.round(t * 1000) / 1000;

const easeCache = new Map();

// GSAP supplies the easing curves; we only call them as pure functions.
function parseEase(name) {
  try {
    return gsap.parseEase(name);
  } catch {
    return undefined;
  }
}

export function getEaseFn(name) {
  if (easeCache.has(name)) return easeCache.get(name);
  const parsed = parseEase(name);
  const fn = typeof parsed === "function" ? parsed : (p) => p; // unknown ease: linear
  easeCache.set(name, fn);
  return fn;
}

export function findKeyframeIndexAt(keyframes, time) {
  if (!keyframes) return -1;
  return keyframes.findIndex((k) => Math.abs(k.time - time) < TIME_EPSILON);
}

export function getLastKeyframeTime(project) {
  let max = 0;
  for (const layer of project.layers) {
    for (const prop of Object.keys(layer.keyframes)) {
      for (const k of layer.keyframes[prop]) max = Math.max(max, k.time);
    }
  }
  return max;
}

// The timeline shows the whole project, and expands if keyframes go past the end.
export function getDisplayEnd(project) {
  return Math.max(project.settings.duration, getLastKeyframeTime(project));
}

export function formatTime(t) {
  const safe = Math.max(0, t);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  const hundredths = Math.floor((safe % 1) * 100);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
}
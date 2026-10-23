import { ANIMATABLE_PROPERTIES, getEaseFn } from "./animationEngine";

// Value of one property at time `time`. Pure and deterministic.
export function evaluateProperty(layer, prop, time) {
  const base = layer.properties[prop];
  const keyframes = layer.keyframes?.[prop];

  if (!keyframes || keyframes.length === 0) return base;

  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];

  if (time < first.time) return base; // before the first keyframe: initial value
  if (time >= last.time) return last.value; // after the last keyframe: hold final value

  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (time >= a.time && time < b.time) {
      const progress = (time - a.time) / (b.time - a.time);
      const eased = getEaseFn(a.ease)(progress); // the segment uses the easing on its start keyframe
      return a.value + (b.value - a.value) * eased;
    }
  }
  return last.value;
}

// All of a layer's values at `time`.
// `overrides` is an optional plain { prop: value } object applied on top of the animated values.
// The engine knows nothing about where overrides come from (the UI uses them for unsaved edits).
export function evaluateLayer(layer, time, overrides = null) {
  const values = { ...layer.properties };
  for (const prop of ANIMATABLE_PROPERTIES) {
    values[prop] = evaluateProperty(layer, prop, time);
  }
  if (overrides) Object.assign(values, overrides);
  return values;
}
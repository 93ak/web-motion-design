import { ANIMATABLE_PROPERTIES, TIME_EPSILON, getEaseFn } from "./animationEngine";

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

// All of a layer's values at `time`. A draft (an unsaved inspector edit on an
// animated property) overrides the animated value at exactly that time.
export function evaluateLayer(layer, time, draft = null) {
  const values = { ...layer.properties };
  for (const prop of ANIMATABLE_PROPERTIES) {
    values[prop] = evaluateProperty(layer, prop, time);
  }
  if (
    draft &&
    draft.layerId === layer.id &&
    Math.abs(draft.time - time) < TIME_EPSILON
  ) {
    Object.assign(values, draft.values);
  }
  return values;
}
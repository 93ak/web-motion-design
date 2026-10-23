import {
  ANIMATABLE_PROPERTIES,
  TIME_EPSILON,
  clamp,
  roundTime,
} from "../engine/animationEngine";

const HEX = /^#[0-9a-fA-F]{6}$/;

const LIMITS = {
  opacity: [0, 1],
  scale: [0, 100],
  width: [1, 10000],
  height: [1, 10000],
  fontSize: [1, 1000],
};

// Returns a clean value, or null if it is unusable.
function sanitizeValue(prop, value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const limits = LIMITS[prop];
    return limits ? clamp(value, limits[0], limits[1]) : value;
  }
  return typeof value === "string" ? value : null;
}

// Apply `fn` to one layer. Returns the SAME project object if nothing changed,
// which lets the history wrapper skip no-op edits.
function mapLayer(project, id, fn) {
  let changed = false;
  const layers = project.layers.map((layer) => {
    if (layer.id !== id) return layer;
    const next = fn(layer);
    if (next !== layer) changed = true;
    return next;
  });
  return changed ? { ...project, layers } : project;
}

// Replace a property's keyframe list. Invariant: the base value equals the first
// keyframe's value, so the property holds that value before the first keyframe.
function withKeyframes(layer, prop, list) {
  const keyframes = { ...layer.keyframes };
  let properties = layer.properties;
  if (list.length === 0) {
    delete keyframes[prop];
  } else {
    keyframes[prop] = list;
    properties = { ...layer.properties, [prop]: list[0].value };
  }
  return { ...layer, keyframes, properties };
}

function sanitizeSettings(current, patch) {
  const next = { ...current };

  if ("width" in patch) {
    const v = Math.round(Number(patch.width));
    if (Number.isFinite(v) && v >= 1 && v <= 8000) next.width = v;
  }
  if ("height" in patch) {
    const v = Math.round(Number(patch.height));
    if (Number.isFinite(v) && v >= 1 && v <= 8000) next.height = v;
  }
  if ("duration" in patch) {
    const v = Number(patch.duration);
    if (Number.isFinite(v) && v > 0 && v <= 3600) next.duration = Math.round(v * 1000) / 1000;
  }
  if ("fps" in patch) {
    const v = Math.round(Number(patch.fps));
    if (Number.isFinite(v) && v >= 1 && v <= 120) next.fps = v;
  }
  if ("background" in patch) {
    const v = patch.background;
    if (v === "transparent" || (typeof v === "string" && HEX.test(v))) next.background = v;
  }
  if ("loop" in patch && typeof patch.loop === "boolean") next.loop = patch.loop;

  const same = Object.keys(next).every((key) => next[key] === current[key]);
  return same ? current : next;
}

export function projectReducer(project, action) {
  switch (action.type) {
    case "SET_NAME": {
      const name = String(action.name ?? "").trim();
      return name && name !== project.name ? { ...project, name } : project;
    }

    case "SET_SETTINGS": {
      const settings = sanitizeSettings(project.settings, action.patch ?? {});
      return settings === project.settings ? project : { ...project, settings };
    }

    case "ADD_LAYER":
      return { ...project, layers: [...project.layers, action.layer] };

    case "DELETE_LAYER": {
      if (!project.layers.some((l) => l.id === action.id)) return project;
      return { ...project, layers: project.layers.filter((l) => l.id !== action.id) };
    }

    case "RENAME_LAYER": {
      const name = String(action.name ?? "").trim();
      if (!name) return project;
      return mapLayer(project, action.id, (l) => (l.name === name ? l : { ...l, name }));
    }

    case "TOGGLE_VISIBILITY":
      return mapLayer(project, action.id, (l) => ({ ...l, visible: !l.visible }));

    // direction +1 = toward the front (later in the array), -1 = toward the back.
    case "MOVE_LAYER": {
      const from = project.layers.findIndex((l) => l.id === action.id);
      const to = from + action.direction;
      if (from < 0 || to < 0 || to >= project.layers.length) return project;
      const layers = [...project.layers];
      [layers[from], layers[to]] = [layers[to], layers[from]];
      return { ...project, layers };
    }

    case "SET_PROPERTY": {
      const value = sanitizeValue(action.prop, action.value);
      if (value === null) return project;
      return mapLayer(project, action.id, (l) => {
        if (!(action.prop in l.properties) || l.properties[action.prop] === value) return l;
        // Animated properties change through keyframes only. Editing the base value here
        // would break the "base equals first keyframe" invariant.
        if (l.keyframes[action.prop]?.length) return l;
        return { ...l, properties: { ...l.properties, [action.prop]: value } };
      });
    }

    // Add a keyframe at `time`, or update the value of the one already there.
    // A property never gets two keyframes at the same time.
    case "SET_KEYFRAME": {
      const { id, prop } = action;
      if (!ANIMATABLE_PROPERTIES.includes(prop)) return project;
      const value = sanitizeValue(prop, action.value);
      if (typeof value !== "number") return project;
      const time = roundTime(Math.max(0, action.time));

      return mapLayer(project, id, (layer) => {
        const list = layer.keyframes[prop] ?? [];
        const index = list.findIndex((k) => Math.abs(k.time - time) < TIME_EPSILON);

        if (index >= 0) {
          if (list[index].value === value) return layer;
          return withKeyframes(layer, prop, list.map((k, i) => (i === index ? { ...k, value } : k)));
        }
        const next = [...list, { time, value, ease: action.ease ?? "none" }].sort(
          (a, b) => a.time - b.time
        );
        return withKeyframes(layer, prop, next);
      });
    }

    // Deleting a keyframe never deletes the layer.
    case "DELETE_KEYFRAME": {
      return mapLayer(project, action.id, (layer) => {
        const list = layer.keyframes[action.prop];
        if (!list) return layer;
        const next = list.filter((k) => Math.abs(k.time - action.time) >= TIME_EPSILON);
        if (next.length === list.length) return layer;
        return withKeyframes(layer, action.prop, next);
      });
    }

    // patch: { time?, value?, ease? }
    case "UPDATE_KEYFRAME": {
      const { id, prop, time, patch } = action;
      return mapLayer(project, id, (layer) => {
        const list = layer.keyframes[prop];
        if (!list) return layer;
        const index = list.findIndex((k) => Math.abs(k.time - time) < TIME_EPSILON);
        if (index < 0) return layer;

        const current = list[index];
        const updated = { ...current };

        if (patch.time !== undefined) {
          const t = roundTime(Math.max(0, Number(patch.time)));
          if (!Number.isFinite(t)) return layer;
          const collides = list.some((k, i) => i !== index && Math.abs(k.time - t) < TIME_EPSILON);
          if (collides) return layer; // same-time keyframes are not allowed
          updated.time = t;
        }
        if (patch.value !== undefined) {
          const v = sanitizeValue(prop, patch.value);
          if (typeof v !== "number") return layer;
          updated.value = v;
        }
        if (typeof patch.ease === "string") updated.ease = patch.ease;

        if (
          updated.time === current.time &&
          updated.value === current.value &&
          updated.ease === current.ease
        ) {
          return layer;
        }

        const next = list.map((k, i) => (i === index ? updated : k)).sort((a, b) => a.time - b.time);
        return withKeyframes(layer, prop, next);
      });
    }

    default:
      return project;
  }
}
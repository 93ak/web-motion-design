import NumberField from "./NumberField";
import { LAYER_TYPES } from "../state/projectFactory";
import { PROPERTY_LABELS, findKeyframeIndexAt } from "../engine/animationEngine";

const ANIMATED_ROWS = [
  { prop: "x", label: PROPERTY_LABELS.x, step: 1 },
  { prop: "y", label: PROPERTY_LABELS.y, step: 1 },
  { prop: "scale", label: PROPERTY_LABELS.scale, step: 0.05, min: 0 },
  { prop: "rotation", label: "Rotation °", step: 1 },
  { prop: "opacity", label: "Opacity %", step: 1, min: 0, max: 100, percent: true },
];

export default function Inspector({
  layer,
  values,
  currentTime,
  draftProps,
  selectedProperty,
  onChange,
  onSelectProperty,
  onAddKeyframe,
}) {
  if (!layer) {
    return (
      <aside className="inspector panel" aria-label="Inspector">
        <h2>Inspector</h2>
        <p className="empty">Select a layer to edit its properties.</p>
      </aside>
    );
  }

  const hasSize = layer.type === "rectangle" || layer.type === "circle";

  return (
    <aside className="inspector panel" aria-label="Inspector">
      <h2>Inspector</h2>
      <p className="inspector-subtitle">
        {LAYER_TYPES[layer.type].icon} {layer.name}
      </p>

      <div className="field-group">
        <h3>Transform</h3>
        {ANIMATED_ROWS.map(({ prop, label, step, min, max, percent }) => {
          const animated = (layer.keyframes[prop]?.length ?? 0) > 0;
          const keyHere = findKeyframeIndexAt(layer.keyframes[prop], currentTime) >= 0;
          const isDraft = draftProps.includes(prop);
          const shown = percent ? values[prop] * 100 : values[prop];

          return (
            <div key={prop} className={`field-row ${selectedProperty === prop ? "active" : ""}`}>
              <label>
                <span className="field-label">{label}</span>
                <NumberField
                  value={shown}
                  step={step}
                  min={min}
                  max={max}
                  precision={percent ? 1 : 2}
                  ariaLabel={label}
                  onCommit={(n) => onChange(prop, percent ? n / 100 : n)}
                />
              </label>
              <button
                className={`kf-btn ${keyHere ? "on" : ""} ${animated ? "animated" : ""}`}
                aria-label={`Add keyframe for ${PROPERTY_LABELS[prop]} at the playhead`}
                title={
                  keyHere
                    ? "Keyframe exists at this time"
                    : "Add keyframe at the playhead with this value"
                }
                onClick={() => {
                  onSelectProperty(prop);
                  onAddKeyframe(prop);
                }}
              >
                {keyHere ? "◆" : "◇"}
              </button>
              {isDraft && (
                <span className="draft-hint">Unsaved edit. Click ◇ to keyframe it.</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="field-group">
        <h3>Appearance</h3>

        <div className="field-row">
          <label>
            <span className="field-label">Fill color</span>
            <input
              type="color"
              value={values.color}
              aria-label="Fill color"
              onChange={(e) => onChange("color", e.target.value)}
            />
          </label>
        </div>

        {hasSize && (
          <>
            <div className="field-row">
              <label>
                <span className="field-label">Width</span>
                <NumberField
                  value={values.width}
                  min={1}
                  ariaLabel="Width"
                  onCommit={(n) => onChange("width", n)}
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                <span className="field-label">Height</span>
                <NumberField
                  value={values.height}
                  min={1}
                  ariaLabel="Height"
                  onCommit={(n) => onChange("height", n)}
                />
              </label>
            </div>
          </>
        )}

        {layer.type === "text" && (
          <>
            <div className="field-row stacked">
              <label>
                <span className="field-label">Text</span>
                <textarea
                  rows={3}
                  value={values.text}
                  aria-label="Text content"
                  onChange={(e) => onChange("text", e.target.value)}
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                <span className="field-label">Font size</span>
                <NumberField
                  value={values.fontSize}
                  min={1}
                  ariaLabel="Font size"
                  onCommit={(n) => onChange("fontSize", n)}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
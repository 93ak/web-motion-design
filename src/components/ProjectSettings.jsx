import { useState } from "react";
import { TIME_EPSILON } from "../engine/animationEngine";

export default function ProjectSettings({ settings, lastKeyframeTime, onApply, onClose }) {
  const [form, setForm] = useState({
    width: String(settings.width),
    height: String(settings.height),
    duration: String(settings.duration),
    transparent: settings.background === "transparent",
    background: settings.background === "transparent" ? "#f5f2ef" : settings.background,
    loop: settings.loop,
  });
  const [error, setError] = useState("");

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const durationNumber = Number(form.duration);
  const truncates =
    Number.isFinite(durationNumber) && lastKeyframeTime > durationNumber + TIME_EPSILON;

  const apply = () => {
    const width = Number(form.width);
    const height = Number(form.height);
    const duration = Number(form.duration);

    if (!Number.isInteger(width) || width < 1 || width > 8000)
      return setError("Width must be a whole number between 1 and 8000.");
    if (!Number.isInteger(height) || height < 1 || height > 8000)
      return setError("Height must be a whole number between 1 and 8000.");
    if (!Number.isFinite(duration) || duration <= 0 || duration > 3600)
      return setError("Duration must be greater than 0 and at most 3600 seconds.");

    onApply({
      width,
      height,
      duration,
      loop: form.loop,
      background: form.transparent ? "transparent" : form.background,
    });
    onClose();
    return undefined;
  };

  return (
    <div
      className="modal-overlay"
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">Project Settings</h2>

        <label className="modal-row">
          Canvas width (px)
          <input
            type="number"
            autoFocus
            value={form.width}
            onChange={(e) => set("width", e.target.value)}
          />
        </label>
        <label className="modal-row">
          Canvas height (px)
          <input type="number" value={form.height} onChange={(e) => set("height", e.target.value)} />
        </label>
        <label className="modal-row">
          Duration (seconds)
          <input
            type="number"
            step="0.5"
            value={form.duration}
            onChange={(e) => set("duration", e.target.value)}
          />
        </label>

        {truncates && (
          <p className="tl-warning inline" role="alert">
            ⚠ Keyframes extend to {lastKeyframeTime.toFixed(2)} s. They won't be deleted, but
            playback will stop at {durationNumber} s.
            <button onClick={() => set("duration", String(Math.ceil(lastKeyframeTime * 10) / 10))}>
              Match last keyframe
            </button>
          </p>
        )}

        <label className="modal-row">
          Frame rate
          <input type="text" value="30 FPS (fixed in v1)" disabled readOnly />
        </label>

        <label className="modal-row check">
          <input
            type="checkbox"
            checked={form.transparent}
            onChange={(e) => set("transparent", e.target.checked)}
          />
          Transparent background
        </label>
        <label className="modal-row">
          Background color
          <input
            type="color"
            value={form.background}
            disabled={form.transparent}
            onChange={(e) => set("background", e.target.value)}
          />
        </label>

        <label className="modal-row check">
          <input
            type="checkbox"
            checked={form.loop}
            onChange={(e) => set("loop", e.target.checked)}
          />
          Loop playback (otherwise it stops at the end)
        </label>

        {error && (
          <p className="tl-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={apply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
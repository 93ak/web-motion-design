import { useEffect, useMemo, useRef, useState } from "react";
import TimeRuler from "./TimeRuler";
import Playhead from "./Playhead";
import KeyframeTrack from "./KeyframeTrack";
import NumberField from "../NumberField";
import { LAYER_TYPES } from "../../state/projectFactory";
import {
  ANIMATABLE_PROPERTIES,
  EASE_OPTIONS,
  FPS,
  PROPERTY_LABELS,
  PROPERTY_SHORT,
  TIME_EPSILON,
  clamp,
  findKeyframeIndexAt,
  formatTime,
  getDisplayEnd,
  getLastKeyframeTime,
  roundTime,
} from "../../engine/animationEngine";

export default function Timeline({
  project,
  currentTime,
  isPlaying,
  selectedLayerId,
  selectedProperty,
  selectedKeyframe,
  onSeek,
  onTogglePlay,
  onStop,
  onReplay,
  onStepFrame,
  onSelectLayer,
  onSelectProperty,
  onSelectKeyframe,
  onAddKeyframe,
  onDeleteKeyframe,
  onUpdateKeyframe,
  onExtendDuration,
}) {
  const { duration } = project.settings;
  const displayEnd = getDisplayEnd(project);
  const lastKeyframeTime = getLastKeyframeTime(project);

  const tracksRef = useRef(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [timeError, setTimeError] = useState("");

  // Auto-expand the selected layer so its property tracks are visible.
  useEffect(() => {
    if (!selectedLayerId) return;
    setExpanded((prev) => (prev.has(selectedLayerId) ? prev : new Set(prev).add(selectedLayerId)));
  }, [selectedLayerId]);

  const toggleExpanded = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ---- scrubbing (click or drag on the ruler or any track) ----
  const timeFromPointer = (e) => {
    const rect = tracksRef.current.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return Math.round(ratio * displayEnd * FPS) / FPS; // snap to whole frames
  };

  const startScrub = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onSeek(timeFromPointer(e));
    const move = (ev) => onSeek(timeFromPointer(ev));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ---- rows (front-most layer on top, matching the Layers panel) ----
  const rows = useMemo(() => {
    const list = [];
    [...project.layers].reverse().forEach((layer) => {
      list.push({ kind: "layer", layer, key: layer.id });
      if (expanded.has(layer.id)) {
        ANIMATABLE_PROPERTIES.forEach((prop) =>
          list.push({ kind: "prop", layer, prop, key: `${layer.id}:${prop}` })
        );
      }
    });
    return list;
  }, [project.layers, expanded]);

  // ---- selected keyframe (looked up fresh so undo/redo can't leave it stale) ----
  let keyframeObj = null;
  if (selectedKeyframe) {
    const layer = project.layers.find((l) => l.id === selectedKeyframe.layerId);
    const list = layer?.keyframes[selectedKeyframe.prop];
    const index = list ? findKeyframeIndexAt(list, selectedKeyframe.time) : -1;
    if (index >= 0) keyframeObj = list[index];
  }

  const commitKeyframeTime = (n) => {
    const t = roundTime(Math.max(0, n));
    const layer = project.layers.find((l) => l.id === selectedKeyframe.layerId);
    const list = layer.keyframes[selectedKeyframe.prop];
    const collides = list.some((k) => k !== keyframeObj && Math.abs(k.time - t) < TIME_EPSILON);
    if (collides) {
      setTimeError("Another keyframe on this property is already at that time.");
      return;
    }
    setTimeError("");
    onUpdateKeyframe({ time: t });
  };

  const endPercent = (duration / displayEnd) * 100;

  return (
    <section className="timeline" aria-label="Timeline">
      <div className="tl-toolbar">
        <div className="tl-controls">
          <button onClick={onTogglePlay} className="primary" title="Play / pause (Space)">
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={onStop} title="Stop and return to 0">
            ■ Stop
          </button>
          <button onClick={onReplay} title="Restart from 0">
            ↻ Replay
          </button>
          <button onClick={() => onStepFrame(-1)} title="Previous frame">
            ◀ Prev frame
          </button>
          <button onClick={() => onStepFrame(1)} title="Next frame">
            Next frame ▶
          </button>
        </div>

        <div className="tl-readout" aria-live="off">
          {formatTime(currentTime)} · frame {Math.round(currentTime * FPS)} · {duration.toFixed(1)} s
        </div>

        <div className="tl-keyframe-controls">
          <select
            value={selectedProperty}
            aria-label="Property to keyframe"
            onChange={(e) => onSelectProperty(e.target.value)}
          >
            {ANIMATABLE_PROPERTIES.map((p) => (
              <option key={p} value={p}>
                {PROPERTY_LABELS[p]}
              </option>
            ))}
          </select>
          <button
            disabled={!selectedLayerId}
            onClick={() => onAddKeyframe(selectedProperty)}
            title="Record the property's value at the playhead"
          >
            ◆ Add keyframe
          </button>
          <button className="danger" disabled={!keyframeObj} onClick={onDeleteKeyframe}>
            Delete keyframe
          </button>
        </div>
      </div>

      {keyframeObj && (
        <div className="tl-kf-editor">
          <span className="tl-kf-title">
            Keyframe · {PROPERTY_SHORT[selectedKeyframe.prop]}
          </span>
          <label>
            Time (s)
            <NumberField
              value={keyframeObj.time}
              min={0}
              step={0.1}
              precision={3}
              ariaLabel="Keyframe time in seconds"
              onCommit={commitKeyframeTime}
            />
          </label>
          <label>
            Value
            <NumberField
              value={keyframeObj.value}
              step={selectedKeyframe.prop === "opacity" ? 0.05 : 1}
              precision={3}
              ariaLabel="Keyframe value"
              onCommit={(n) => onUpdateKeyframe({ value: n })}
            />
          </label>
          <label>
            Ease to next keyframe
            <select
              value={keyframeObj.ease}
              aria-label="Easing to next keyframe"
              onChange={(e) => onUpdateKeyframe({ ease: e.target.value })}
            >
              {EASE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
              {!EASE_OPTIONS.some((o) => o.value === keyframeObj.ease) && (
                <option value={keyframeObj.ease}>{keyframeObj.ease}</option>
              )}
            </select>
          </label>
          {timeError && <span className="tl-error">{timeError}</span>}
        </div>
      )}

      {lastKeyframeTime > duration + TIME_EPSILON && (
        <div className="tl-warning" role="alert">
          ⚠ Animation extends to {lastKeyframeTime.toFixed(2)} s, past the project end (
          {duration} s). Playback stops at the project end.
          <button onClick={() => onExtendDuration(Math.ceil(lastKeyframeTime * 10) / 10)}>
            Extend project to {(Math.ceil(lastKeyframeTime * 10) / 10).toFixed(1)} s
          </button>
        </div>
      )}

      <div className="tl-scroll">
        <div className="tl-labels">
          <div className="tl-row tl-ruler-label">Layers</div>

          {rows.map((row) => {
            const { layer } = row;

            if (row.kind === "layer") {
              const open = expanded.has(layer.id);
              return (
                <div
                  key={row.key}
                  className={`tl-row tl-label tl-layer ${layer.id === selectedLayerId ? "selected" : ""}`}
                  onClick={() => onSelectLayer(layer.id)}
                >
                  <button
                    className="tl-expander"
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${layer.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(layer.id);
                    }}
                  >
                    {open ? "▾" : "▸"}
                  </button>
                  <span className="layer-icon">{LAYER_TYPES[layer.type].icon}</span>
                  <span className="tl-name">{layer.name}</span>
                </div>
              );
            }

            const isSelectedProp = layer.id === selectedLayerId && row.prop === selectedProperty;
            return (
              <div
                key={row.key}
                className={`tl-row tl-label tl-prop ${isSelectedProp ? "selected" : ""}`}
                onClick={() => {
                  onSelectLayer(layer.id);
                  onSelectProperty(row.prop);
                }}
              >
                {layer.name} · {PROPERTY_SHORT[row.prop]}
              </div>
            );
          })}
        </div>

        <div className="tl-tracks" ref={tracksRef}>
          <TimeRuler displayEnd={displayEnd} duration={duration} onPointerDown={startScrub} />

          {rows.map((row) => {
            const { layer } = row;

            if (row.kind === "layer") {
              // Summary row: every keyframe time on this layer, display only.
              const times = [
                ...new Set(
                  ANIMATABLE_PROPERTIES.flatMap((p) => (layer.keyframes[p] ?? []).map((k) => k.time))
                ),
              ].map((time) => ({ time, value: 0 }));

              return (
                <KeyframeTrack
                  key={row.key}
                  keyframes={times}
                  displayEnd={displayEnd}
                  interactive={false}
                  selectedTime={null}
                  highlighted={layer.id === selectedLayerId}
                  label={layer.name}
                  onPointerDown={startScrub}
                />
              );
            }

            const isThisTrackSelected =
              selectedKeyframe &&
              selectedKeyframe.layerId === layer.id &&
              selectedKeyframe.prop === row.prop;

            return (
              <KeyframeTrack
                key={row.key}
                keyframes={layer.keyframes[row.prop] ?? []}
                displayEnd={displayEnd}
                interactive
                selectedTime={isThisTrackSelected ? selectedKeyframe.time : null}
                highlighted={layer.id === selectedLayerId && row.prop === selectedProperty}
                label={`${layer.name} ${PROPERTY_SHORT[row.prop]}`}
                onSelect={(time) => onSelectKeyframe(layer.id, row.prop, time)}
                onPointerDown={startScrub}
              />
            );
          })}

          {displayEnd > duration + 1e-6 && (
            <div className="tl-end-zone" style={{ left: `${endPercent}%` }} aria-hidden="true" />
          )}
          <Playhead time={currentTime} displayEnd={displayEnd} />
        </div>
      </div>
    </section>
  );
}
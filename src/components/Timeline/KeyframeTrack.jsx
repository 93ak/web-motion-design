export default function KeyframeTrack({
  keyframes,
  displayEnd,
  interactive,
  selectedTime,
  highlighted,
  label,
  onSelect,
  onPointerDown,
}) {
  return (
    <div
      className={`tl-row tl-track ${highlighted ? "highlighted" : ""}`}
      onPointerDown={onPointerDown}
    >
      {keyframes.map((k) => {
        const isSelected = selectedTime !== null && Math.abs(k.time - selectedTime) < 0.001;
        return (
          <button
            key={k.time}
            className={`kf ${isSelected ? "selected" : ""} ${interactive ? "" : "passive"}`}
            style={{ left: `${(k.time / displayEnd) * 100}%` }}
            tabIndex={interactive ? 0 : -1}
            aria-label={`${label} keyframe at ${k.time} seconds`}
            title={interactive ? `${k.time}s · value ${Math.round(k.value * 100) / 100}` : undefined}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => interactive && onSelect(k.time)}
          />
        );
      })}
    </div>
  );
}
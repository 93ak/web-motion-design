export default function Playhead({ time, displayEnd }) {
  const percent = Math.min(100, Math.max(0, (time / displayEnd) * 100));
  return (
    <div className="tl-playhead" style={{ left: `${percent}%` }} aria-hidden="true">
      <span className="tl-playhead-handle" />
    </div>
  );
}
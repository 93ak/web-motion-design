export default function TimeRuler({ displayEnd, duration, onPointerDown }) {
  let step = 1;
  if (displayEnd > 10) step = 2;
  if (displayEnd > 30) step = 5;
  if (displayEnd > 60) step = 10;

  const ticks = [];
  for (let t = 0; t <= displayEnd + 1e-6; t += step) ticks.push(t);

  return (
    <div className="tl-row tl-ruler" onPointerDown={onPointerDown} title="Click or drag to scrub">
      {ticks.map((t) => (
        <span key={t} className="tl-tick" style={{ left: `${(t / displayEnd) * 100}%` }}>
          <i />
          {t}s
        </span>
      ))}
      {displayEnd > duration + 1e-6 && (
        <span className="tl-end-flag" style={{ left: `${(duration / displayEnd) * 100}%` }}>
          end
        </span>
      )}
    </div>
  );
}
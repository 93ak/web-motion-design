import { useState } from "react";

const round = (value, places) => {
  const m = 10 ** places;
  return Math.round(value * m) / m;
};

// A number input that shows a tidy rounded value normally, but keeps exactly what
// you type while focused (so "12." and "0.0" don't get eaten mid-typing).
export default function NumberField({
  value,
  onCommit,
  min,
  max,
  step = 1,
  precision = 2,
  disabled = false,
  ariaLabel,
}) {
  const [text, setText] = useState(null);
  const shown = text ?? String(round(value, precision));

  return (
    <input
      type="number"
      className="num"
      value={shown}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={ariaLabel}
      onFocus={() => setText(String(round(value, precision)))}
      onBlur={() => setText(null)}
      onChange={(e) => {
        setText(e.target.value);
        const n = e.target.valueAsNumber;
        if (Number.isFinite(n)) onCommit(n);
      }}
    />
  );
}
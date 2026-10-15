import { useEffect, useRef, useState } from "react";
import { LAYER_TYPES } from "../state/projectFactory";

export default function AddLayerMenu({ onAdd, label = "+ Add Shape", direction = "down" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="menu" ref={rootRef}>
      <button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label} ▾
      </button>
      {open && (
        <ul className={`menu-list ${direction === "up" ? "menu-up" : ""}`} role="menu">
          {Object.entries(LAYER_TYPES).map(([type, info]) => (
            <li key={type} role="none">
              <button
                role="menuitem"
                onClick={() => {
                  onAdd(type);
                  setOpen(false);
                }}
              >
                <span className="layer-icon">{info.icon}</span> {info.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
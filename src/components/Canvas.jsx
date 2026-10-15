import { useLayoutEffect, useRef, useState } from "react";
import { evaluateLayer } from "../engine/evaluateProperty";

function LayerView({ layer, values, selected, fit, onSelect }) {
  // Keep the selection outline ~2 screen pixels wide regardless of zoom/scale.
  const outlinePx = 2 / (fit * Math.max(values.scale, 0.05));

  const style = {
    position: "absolute",
    left: values.x,
    top: values.y,
    opacity: values.opacity,
    transform: `translate(-50%, -50%) scale(${values.scale}) rotate(${values.rotation}deg)`,
    transformOrigin: "center center",
    cursor: "pointer",
    outline: selected ? `${outlinePx}px solid #4f8cff` : "none",
    outlineOffset: selected ? `${outlinePx * 2}px` : 0,
  };

  if (layer.type === "rectangle") {
    Object.assign(style, { width: values.width, height: values.height, background: values.color });
  } else if (layer.type === "circle") {
    Object.assign(style, {
      width: values.width,
      height: values.height,
      background: values.color,
      borderRadius: "50%",
    });
  } else {
    Object.assign(style, {
      color: values.color,
      fontSize: values.fontSize,
      fontWeight: 700,
      fontFamily: "Inter, system-ui, Arial, sans-serif",
      lineHeight: 1.15,
      whiteSpace: "pre",
      minWidth: 40,
      minHeight: values.fontSize,
      userSelect: "none",
    });
  }

  return (
    <div
      style={style}
      data-layer-id={layer.id}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(layer.id);
      }}
    >
      {layer.type === "text" ? values.text : null}
    </div>
  );
}

export default function Canvas({ project, currentTime, draft, selectedLayerId, onSelectLayer }) {
  const { width, height, background } = project.settings;
  const transparent = background === "transparent";

  const areaRef = useRef(null);
  const [fit, setFit] = useState(0.5);

  // Fit the fixed-size artboard into the available space.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return undefined;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const next = Math.min((rect.width - 48) / width, (rect.height - 64) / height);
      setFit(Math.max(0.02, next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height]);

  const clearSelection = (e) => {
    if (e.target === e.currentTarget) onSelectLayer(null);
  };

  return (
    <section className="canvas-area" ref={areaRef} onPointerDown={clearSelection} aria-label="Canvas">
      <div className="artboard-frame" style={{ width: width * fit, height: height * fit }}>
        <div
          className={`artboard ${transparent ? "is-transparent" : ""}`}
          style={{
            width,
            height,
            transform: `scale(${fit})`,
            background: transparent ? undefined : background,
          }}
          onPointerDown={clearSelection}
        >
          {project.layers
            .filter((layer) => layer.visible)
            .map((layer) => (
              <LayerView
                key={layer.id}
                layer={layer}
                values={evaluateLayer(layer, currentTime, draft)}
                selected={layer.id === selectedLayerId}
                fit={fit}
                onSelect={onSelectLayer}
              />
            ))}
        </div>
      </div>

      <div className="canvas-label">
        CANVAS · {width} × {height} · {Math.round(fit * 100)}%
      </div>
    </section>
  );
}
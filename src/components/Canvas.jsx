import { useLayoutEffect, useRef, useState } from "react";

// Draws ONE resolved scene item. What the numbers mean (x/y is the centre, transform order,
// text style) is defined in engine/resolveScene.js. This file only translates it to CSS.
function SceneItem({ item, selected, fit, onSelect }) {
  const { x, y, scale, rotation } = item.transform;
  const c = item.content;

  // Keep the selection outline ~2 screen pixels wide regardless of zoom/scale.
  const outlinePx = 2 / (fit * Math.max(scale, 0.05));

  const style = {
    position: "absolute",
    left: x,
    top: y,
    opacity: item.opacity,
    transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: "center center",
    cursor: "pointer",
    outline: selected ? `${outlinePx}px solid #4f8cff` : "none",
    outlineOffset: selected ? `${outlinePx * 2}px` : 0,
  };

  if (c.kind === "rect" || c.kind === "ellipse") {
    Object.assign(style, { width: c.width, height: c.height, background: c.fill });
    if (c.kind === "ellipse") style.borderRadius = "50%";
  } else if (c.kind === "text") {
    Object.assign(style, {
      color: c.fill,
      fontSize: c.fontSize,
      fontWeight: c.fontWeight,
      fontFamily: c.fontFamily,
      lineHeight: c.lineHeight,
      whiteSpace: "pre",
      minWidth: 40,
      minHeight: c.fontSize,
      userSelect: "none",
    });
  }

  return (
    <div
      style={style}
      data-layer-id={item.id}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      {c.kind === "text" ? c.text : null}
    </div>
  );
}

export default function Canvas({ scene, selectedLayerId, onSelectLayer }) {
  const { width, height, background } = scene;
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
          {scene.items.map((item) => (
            <SceneItem
              key={item.id}
              item={item}
              selected={item.id === selectedLayerId}
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
import { useRef, useEffect } from "react";
import gsap from "gsap";
import LayerRenderer from "./layers/LayerRenderer";

function Canvas({ layers }) {
  const circleRef = useRef();

  useEffect(() => {
    if (!circleRef.current) return;
    gsap.to(circleRef.current, {
      x: 400,
      duration: 2,
      ease: "power2.inOut",
    });
  }, []);

  return (
    <div className="canvas">
      {layers.map((layer) => (
        <LayerRenderer
          key={layer.id}
          layer={layer}
          innerRef={layer.type === "circle" ? circleRef : undefined}
        />
      ))}
    </div>
  );
}

export default Canvas;
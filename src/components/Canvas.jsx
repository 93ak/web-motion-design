import { useRef } from "react";
import gsap from "gsap";
import LayerRenderer from "./layers/LayerRenderer";

function Canvas({ layers }) {
  const nodeRefs = useRef(new Map());

  // Callback ref: runs when a layer's DOM node mounts/unmounts.
  // Each layer gets its own entry, so this scales to any number of layers.
  const setNodeRef = (id) => (el) => {
    if (el) {
      nodeRefs.current.set(id, el);
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    } else {
      nodeRefs.current.delete(id);
    }
  };

  return (
    <div className="canvas">
      {layers.map((layer) => (
        <LayerRenderer
          key={layer.id}
          layer={layer}
          innerRef={setNodeRef(layer.id)}
        />
      ))}
    </div>
  );
}

export default Canvas;
import CircleLayer from "./CircleLayer";

// Extensibility point: add "text", "image", "svg", "3d", "particles" here later.
const layerComponents = {
  circle: CircleLayer,
};

function LayerRenderer({ layer, innerRef }) {
  const Component = layerComponents[layer.type];

  if (!Component) return null;

  return <Component layer={layer} innerRef={innerRef} />;
}

export default LayerRenderer;
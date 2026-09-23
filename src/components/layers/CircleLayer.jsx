function CircleLayer({ layer, innerRef }) {
  const { x, y, scale, rotation, opacity, color } = layer;
//actually creates the HTML element, react component
  return (
    <div
      ref={innerRef}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: color,
        opacity,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
      }}
    />
  );
}

export default CircleLayer;
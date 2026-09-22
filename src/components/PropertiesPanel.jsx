function PropertiesPanel({ layer, onChangeProperty }) {
  if (!layer) {
    return (
      <aside className="properties">
        <h2>Properties</h2>
        <p>No layer selected</p>
      </aside>
    );
  }

  const handleChange = (key) => (e) => {
    const value = parseFloat(e.target.value);
    onChangeProperty(layer.id, key, Number.isNaN(value) ? 0 : value);
  };

  return (
    <aside className="properties">
      <h2>Properties</h2>

      <p>Position</p>
      <label>
        X:
        <input type="number" value={layer.x} onChange={handleChange("x")} />
      </label>
      <label>
        Y:
        <input type="number" value={layer.y} onChange={handleChange("y")} />
      </label>

      <label>
        Scale:
        <input
          type="number"
          step="0.1"
          value={layer.scale}
          onChange={handleChange("scale")}
        />
      </label>
      <label>
        Rotation:
        <input
          type="number"
          value={layer.rotation}
          onChange={handleChange("rotation")}
        />
        °
      </label>
      <label>
        Opacity:
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={layer.opacity}
          onChange={handleChange("opacity")}
        />
        {Math.round(layer.opacity * 100)}%
      </label>
    </aside>
  );
}

export default PropertiesPanel;
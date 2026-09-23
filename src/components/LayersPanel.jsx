function LayersPanel({ layers, selectedLayerId, onSelectLayer, onAddLayer, onDeleteLayer }) {
  return (
    <aside className="layers">
      <div className="layers-header">
        <h2>Layers</h2>
        <button className="add-layer-btn" onClick={onAddLayer}>+ Add</button>
      </div>

      {layers.map((layer) => (
        <div
          key={layer.id}
          className={`layer-row ${layer.id === selectedLayerId ? "layer-selected" : ""}`}
          onClick={() => onSelectLayer(layer.id)}
        >
          <span>{layer.name}</span>
          <button
            className="delete-layer-btn"
            onClick={(e) => {
              e.stopPropagation(); // don't also select the layer we're deleting
              onDeleteLayer(layer.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </aside>
  );
}

export default LayersPanel;
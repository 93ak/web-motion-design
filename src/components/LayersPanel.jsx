function LayersPanel({ layers, selectedLayerId, onSelectLayer }) {
  return (
    <aside className="layers">
      <h2>Layers</h2>
      {layers.map((layer) => (
        <div
          key={layer.id}
          className={layer.id === selectedLayerId ? "layer-selected" : ""}
          onClick={() => onSelectLayer(layer.id)}
        >
          {layer.name}
        </div>
      ))}
    </aside>
  );
}

export default LayersPanel;
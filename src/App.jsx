import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import LayersPanel from "./components/LayersPanel";
import Canvas from "./components/Canvas";
import Inspector from "./components/Inspector";
import Timeline from "./components/Timeline/Timeline";
import ProjectSettings from "./components/ProjectSettings";
import usePlayback from "./hooks/usePlayback";
import { createHistory, withHistory, canUndo, canRedo } from "./state/history";
import { projectReducer } from "./state/projectReducer";
import { createDemoProject, createEmptyProject, createLayer } from "./state/projectFactory";
import {
  ANIMATABLE_PROPERTIES,
  FPS,
  TIME_EPSILON,
  clamp,
  findKeyframeIndexAt,
  getDisplayEnd,
  getLastKeyframeTime,
  roundTime,
} from "./engine/animationEngine";
import { evaluateLayer, evaluateProperty } from "./engine/evaluateProperty";
import { downloadProject, loadAutosave, readProjectFile, saveAutosave } from "./utils/projectIO";

import "./App.css";

const historyReducer = withHistory(projectReducer);
const initialProject = loadAutosave() ?? createDemoProject();

function App() {
  // ---- the single source of truth: the project (with undo/redo history) ----
  const [history, rawDispatch] = useReducer(historyReducer, initialProject, createHistory);
  const project = history.present;
  const dispatch = useCallback((action) => rawDispatch({ ...action, at: Date.now() }), []);

  // ---- editor (UI) state: not part of the saved project ----
  const [savedProject, setSavedProject] = useState(initialProject);
  const [selectedLayerId, setSelectedLayerId] = useState(initialProject.layers[0]?.id ?? null);
  const [selectedProperty, setSelectedProperty] = useState("x");
  const [selectedKeyframe, setSelectedKeyframe] = useState(null); // { layerId, prop, time }
  const [currentTime, setCurrentTime] = useState(0);
  const [draft, setDraft] = useState(null); // { layerId, time, values }
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { duration, loop } = project.settings;
  const displayEnd = getDisplayEnd(project);
  const isDirty = project !== savedProject; // history keeps object identity, so this is exact

  const playback = usePlayback({ duration, loop, currentTime, setCurrentTime });
  const { isPlaying, pause } = playback;

  const selectedLayer = project.layers.find((l) => l.id === selectedLayerId) ?? null;

  const activeDraft =
    draft && draft.layerId === selectedLayerId && Math.abs(draft.time - currentTime) < TIME_EPSILON
      ? draft
      : null;

  const inspectorValues = selectedLayer ? evaluateLayer(selectedLayer, currentTime, activeDraft) : null;

  // ---- housekeeping effects ----
  // A draft only lives at the exact time/layer it was made.
  useEffect(() => {
    setDraft(null);
  }, [currentTime, selectedLayerId]);

  // Keep the playhead inside the visible range if the range shrinks.
  useEffect(() => {
    if (currentTime > displayEnd) setCurrentTime(displayEnd);
  }, [displayEnd, currentTime]);

  // Autosave (best-effort recovery after a refresh).
  useEffect(() => {
    const id = setTimeout(() => saveAutosave(project), 400);
    return () => clearTimeout(id);
  }, [project]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ---- time / playback ----
  const seek = useCallback(
    (t) => {
      pause();
      setCurrentTime(clamp(t, 0, displayEnd));
    },
    [pause, displayEnd]
  );

  const stepFrame = (direction) => {
    const frame = Math.round(currentTime * FPS) + direction;
    seek(frame / FPS);
  };

  // ---- selection ----
  const selectLayer = (id) => {
    setSelectedLayerId(id);
    setSelectedKeyframe((k) => (k && k.layerId === id ? k : null));
  };

  const selectKeyframe = (layerId, prop, time) => {
    setSelectedLayerId(layerId);
    setSelectedProperty(prop);
    setSelectedKeyframe({ layerId, prop, time });
    seek(time); // jump to it, so the inspector shows that keyframe's value
  };

  // ---- layer actions ----
  const addLayer = (type) => {
    const layer = createLayer(type, project);
    dispatch({ type: "ADD_LAYER", layer });
    setSelectedLayerId(layer.id);
    setSelectedKeyframe(null);
  };

  const deleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    dispatch({ type: "DELETE_LAYER", id: selectedLayerId });
    setSelectedLayerId(null);
    setSelectedKeyframe(null);
  };

  // ---- inspector edits ----
  // Static props edit the layer directly. Animated props follow the keyframe rules:
  //  - no keyframes yet            -> edit the base value
  //  - keyframe exists at playhead -> update that keyframe
  //  - otherwise                   -> keep an unsaved draft until the user adds a keyframe
  const changeProperty = (prop, value) => {
    if (!selectedLayer) return;
    const id = selectedLayer.id;
    pause();

    if (!ANIMATABLE_PROPERTIES.includes(prop)) {
      dispatch({ type: "SET_PROPERTY", id, prop, value, coalesceKey: `prop:${id}:${prop}` });
      return;
    }

    setSelectedProperty(prop);
    const list = selectedLayer.keyframes[prop] ?? [];

    if (list.length === 0) {
      dispatch({ type: "SET_PROPERTY", id, prop, value, coalesceKey: `prop:${id}:${prop}` });
    } else if (findKeyframeIndexAt(list, currentTime) >= 0) {
      dispatch({
        type: "SET_KEYFRAME",
        id,
        prop,
        time: currentTime,
        value,
        coalesceKey: `kf:${id}:${prop}:${roundTime(currentTime)}`,
      });
    } else {
      setDraft((d) => {
        const sameSpot =
          d && d.layerId === id && Math.abs(d.time - currentTime) < TIME_EPSILON;
        return {
          layerId: id,
          time: currentTime,
          values: { ...(sameSpot ? d.values : {}), [prop]: value },
        };
      });
    }
  };

  // ---- keyframe actions ----
  const addKeyframe = (prop = selectedProperty) => {
    if (!selectedLayer || !ANIMATABLE_PROPERTIES.includes(prop)) return;
    const id = selectedLayer.id;

    const value = activeDraft?.values?.[prop] ?? evaluateProperty(selectedLayer, prop, currentTime);
    const time = roundTime(currentTime);

    dispatch({ type: "SET_KEYFRAME", id, prop, time, value });

    setDraft((d) => {
      if (!d || !(prop in d.values)) return d;
      const rest = { ...d.values };
      delete rest[prop];
      return { ...d, values: rest };
    });
    setSelectedProperty(prop);
    setSelectedKeyframe({ layerId: id, prop, time });
  };

  const deleteKeyframe = () => {
    if (!selectedKeyframe) return;
    dispatch({
      type: "DELETE_KEYFRAME",
      id: selectedKeyframe.layerId,
      prop: selectedKeyframe.prop,
      time: selectedKeyframe.time,
    });
    setSelectedKeyframe(null);
  };

  const updateKeyframe = (patch) => {
    if (!selectedKeyframe) return;
    const { layerId, prop, time } = selectedKeyframe;
    dispatch({
      type: "UPDATE_KEYFRAME",
      id: layerId,
      prop,
      time,
      patch,
      coalesceKey: `ukf:${layerId}:${prop}:${Object.keys(patch).join(",")}`,
    });
    if (patch.time !== undefined) {
      setSelectedKeyframe({ layerId, prop, time: roundTime(Math.max(0, patch.time)) });
    }
  };

  // ---- project actions ----
  const loadProject = (next) => {
    pause();
    rawDispatch({ type: "RESET", project: next });
    setSavedProject(next);
    setSelectedLayerId(null);
    setSelectedKeyframe(null);
    setCurrentTime(0);
    setDraft(null);
  };

  const confirmDiscard = () =>
    !isDirty || window.confirm("You have unsaved changes. Discard them?");

  const newProject = () => {
    if (confirmDiscard()) loadProject(createEmptyProject());
  };

  const openProject = async (file) => {
    const result = await readProjectFile(file);
    if (!result.ok) {
      window.alert(`Could not open "${file.name}":\n\n${result.error}`);
      return;
    }
    if (confirmDiscard()) loadProject(result.project);
  };

  const saveProject = () => {
    downloadProject(project);
    setSavedProject(project);
  };

  const exportProject = () => downloadProject(project);

  const escape = () => {
    if (selectedKeyframe) setSelectedKeyframe(null);
    else if (selectedLayerId) setSelectedLayerId(null);
  };

  // ---- keyboard shortcuts (handlers live in a ref so we bind the listener once) ----
  const shortcutsRef = useRef({});
  shortcutsRef.current = {
    settingsOpen,
    save: saveProject,
    undo: () => dispatch({ type: "UNDO" }),
    redo: () => dispatch({ type: "REDO" }),
    togglePlay: playback.toggle,
    escape,
    remove: () => (selectedKeyframe ? deleteKeyframe() : deleteSelectedLayer()),
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const s = shortcutsRef.current;
      if (s.settingsOpen) return;

      const target = e.target;
      const tag = target instanceof HTMLElement ? target.tagName : "";
      const typing =
        (target instanceof HTMLElement && target.isContentEditable) ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT";
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "s") {
        e.preventDefault();
        s.save();
        return;
      }
      if (typing) return; // let text fields keep their native behaviour

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (e.key === " " && tag !== "BUTTON") {
        e.preventDefault();
        s.togglePlay();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        s.remove();
        return;
      }
      if (e.key === "Escape") s.escape();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app">
      <Toolbar
        projectName={project.name}
        isDirty={isDirty}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        isPlaying={isPlaying}
        onRename={(name) => dispatch({ type: "SET_NAME", name })}
        onAddLayer={addLayer}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        onTogglePlay={playback.toggle}
        onOpenSettings={() => setSettingsOpen(true)}
        onNew={newProject}
        onOpen={openProject}
        onSave={saveProject}
        onExport={exportProject}
      />

      <main className="workspace">
        <LayersPanel
          layers={project.layers}
          selectedLayerId={selectedLayerId}
          onSelect={selectLayer}
          onRename={(id, name) => dispatch({ type: "RENAME_LAYER", id, name })}
          onToggleVisible={(id) => dispatch({ type: "TOGGLE_VISIBILITY", id })}
          onMove={(id, direction) => dispatch({ type: "MOVE_LAYER", id, direction })}
          onDelete={deleteSelectedLayer}
          onAdd={addLayer}
        />

        <Canvas
          project={project}
          currentTime={currentTime}
          draft={draft}
          selectedLayerId={selectedLayerId}
          onSelectLayer={selectLayer}
        />

        <Inspector
          layer={selectedLayer}
          values={inspectorValues}
          currentTime={currentTime}
          draftProps={activeDraft ? Object.keys(activeDraft.values) : []}
          selectedProperty={selectedProperty}
          onChange={changeProperty}
          onSelectProperty={setSelectedProperty}
          onAddKeyframe={addKeyframe}
        />
      </main>

      <Timeline
        project={project}
        currentTime={currentTime}
        isPlaying={isPlaying}
        selectedLayerId={selectedLayerId}
        selectedProperty={selectedProperty}
        selectedKeyframe={selectedKeyframe}
        onSeek={seek}
        onTogglePlay={playback.toggle}
        onStop={playback.stop}
        onReplay={playback.replay}
        onStepFrame={stepFrame}
        onSelectLayer={selectLayer}
        onSelectProperty={setSelectedProperty}
        onSelectKeyframe={selectKeyframe}
        onAddKeyframe={addKeyframe}
        onDeleteKeyframe={deleteKeyframe}
        onUpdateKeyframe={updateKeyframe}
        onExtendDuration={(d) => dispatch({ type: "SET_SETTINGS", patch: { duration: d } })}
      />

      {settingsOpen && (
        <ProjectSettings
          settings={project.settings}
          lastKeyframeTime={getLastKeyframeTime(project)}
          onApply={(patch) => dispatch({ type: "SET_SETTINGS", patch })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
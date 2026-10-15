const HISTORY_LIMIT = 100;
const COALESCE_WINDOW_MS = 1000;

export function createHistory(present) {
  return { past: [], present, future: [], lastKey: null, lastAt: 0 };
}

export const canUndo = (history) => history.past.length > 0;
export const canRedo = (history) => history.future.length > 0;

// Wraps a project reducer with undo/redo.
// - Actions that don't change the project are ignored.
// - Actions sharing a `coalesceKey` within ~1s merge into a single undo step,
//   so dragging a colour picker or typing a number isn't 50 undo entries.
// - Playback never touches this: currentTime isn't part of the project.
export function withHistory(reducer) {
  return function historyReducer(state, action) {
    switch (action.type) {
      case "UNDO": {
        if (state.past.length === 0) return state;
        return {
          past: state.past.slice(0, -1),
          present: state.past[state.past.length - 1],
          future: [state.present, ...state.future],
          lastKey: null,
          lastAt: 0,
        };
      }
      case "REDO": {
        if (state.future.length === 0) return state;
        const [next, ...rest] = state.future;
        return {
          past: [...state.past, state.present],
          present: next,
          future: rest,
          lastKey: null,
          lastAt: 0,
        };
      }
      case "RESET":
        return createHistory(action.project);
      default: {
        const present = reducer(state.present, action);
        if (present === state.present) return state;

        const at = action.at ?? 0;
        const coalesce =
          Boolean(action.coalesceKey) &&
          action.coalesceKey === state.lastKey &&
          at - state.lastAt < COALESCE_WINDOW_MS;

        return {
          past: coalesce ? state.past : [...state.past, state.present].slice(-HISTORY_LIMIT),
          present,
          future: [],
          lastKey: action.coalesceKey ?? null,
          lastAt: at,
        };
      }
    }
  };
}
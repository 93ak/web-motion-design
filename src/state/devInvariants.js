import { checkProjectInvariants } from "../engine/invariants";

// In development, log an error whenever an action leaves the project invalid.
// In production builds this returns the reducer untouched (zero cost).
export function withInvariantChecks(reducer) {
  if (!import.meta.env?.DEV) return reducer;

  return function checkedReducer(project, action) {
    const next = reducer(project, action);
    if (next !== project) {
      const problems = checkProjectInvariants(next);
      if (problems.length > 0) {
        console.error(`[invariants] violated after ${action.type}:`, problems, action);
      }
    }
    return next;
  };
}
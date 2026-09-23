let counter = 0;
export const nextId = (prefix = "layer") => `${prefix}-${++counter}`;
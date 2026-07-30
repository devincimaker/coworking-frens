/**
 * Shared by the circle form and the action behind it. Kept out of actions.ts
 * because a "use server" module may only export async functions — a constant or
 * an initial-state object there fails the page at load.
 */
export const CIRCLE_NAME_MAX = 60;

export type CreateCircleState = { error: string | null; created: boolean };

export const CREATE_CIRCLE_INITIAL: CreateCircleState = { error: null, created: false };

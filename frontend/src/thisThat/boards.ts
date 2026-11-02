export const boards = ["actors", "actresses"] as const;
export type Board = typeof boards[number];
export const isBoard = (value: unknown): value is Board => value === "actors" || value === "actresses";
export const boardFrom = (value: unknown): Board => value === "actresses" ? "actresses" : "actors";
export const boardName = (board: Board) => board === "actors" ? "Actors" : "Actresses";
export const personName = (board: Board) => board === "actors" ? "actor" : "actress";
export const boardUrl = (board: Board, play = false) => `/this-or-that${play ? "/play" : ""}${board === "actresses" ? "?board=actresses" : ""}`;

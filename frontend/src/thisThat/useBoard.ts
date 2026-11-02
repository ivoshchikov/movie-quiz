import { useSearchParams } from "react-router-dom";
import { boardFrom } from "./boards";
import type { Board } from "./boards";

export function useBoard(): [Board, (board: Board) => void] {
  const [params, setParams] = useSearchParams();
  return [boardFrom(params.get("board")), board => {
    const next = new URLSearchParams(params);
    next.set("board", board);
    setParams(next, { preventScrollReset: true });
  }];
}

// Picks the row an unread thread should open at.
//
// bb gives every top-level timeline row an id of `${threadId}:${rest}`:
//   user-seed:<n>                                   a user message
//   <turn>:turn                                     a "Worked for …" summary
//   assistant:kind:assistant|turn:<turn>|parent:…   an assistant message
// The latest reply is the last run of assistant rows that share one turn.

export type RowRef = { id: string };

export type AssistantRow = { turn: string | null };

export function parseAssistantRow(
  threadId: string,
  rowId: string,
): AssistantRow | null {
  const prefix = `${threadId}:`;
  if (!rowId.startsWith(prefix)) return null;
  const rest = rowId.slice(prefix.length);
  if (!rest.startsWith("assistant:")) return null;
  const fields = rest.slice("assistant:".length).split("|");
  if (!fields.includes("kind:assistant")) return null;
  if (fields.some((f) => f.startsWith("parent:") && f !== "parent:root")) {
    return null;
  }
  const turn = fields.find((f) => f.startsWith("turn:"));
  return { turn: turn ? turn.slice("turn:".length) : null };
}

/**
 * Index of the first row of the latest reply in `rows` (document order), or
 * -1 when no assistant row is present.
 */
export function replyStartIndex(threadId: string, rows: RowRef[]): number {
  let last = -1;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (parseAssistantRow(threadId, rows[i].id)) {
      last = i;
      break;
    }
  }
  if (last === -1) return -1;
  const turn = parseAssistantRow(threadId, rows[last].id)?.turn ?? null;
  let start = last;
  while (start > 0) {
    const previous = parseAssistantRow(threadId, rows[start - 1].id);
    if (!previous || previous.turn !== turn) break;
    start -= 1;
  }
  return start;
}

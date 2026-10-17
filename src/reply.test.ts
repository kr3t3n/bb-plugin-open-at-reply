import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAssistantRow, replyStartIndex } from "./reply.ts";

const T = "thr_abc";
const user = (n: number) => ({ id: `${T}:user-seed:${n}` });
const turn = (t: string) => ({ id: `${T}:${t}:turn` });
const reply = (t: string, item: string, parent = "root") => ({
  id: `${T}:assistant:kind:assistant|turn:${t}|parent:${parent}|item:${item}`,
});

test("parses a top-level assistant row", () => {
  assert.deepEqual(parseAssistantRow(T, reply("t2", "i1").id), { turn: "t2" });
});

test("ignores user, turn, nested and other-thread rows", () => {
  assert.equal(parseAssistantRow(T, user(1).id), null);
  assert.equal(parseAssistantRow(T, turn("t2").id), null);
  assert.equal(parseAssistantRow(T, reply("t2", "i1", "tool-9").id), null);
  assert.equal(parseAssistantRow("thr_other", reply("t2", "i1").id), null);
});

test("picks the final reply after the work summary", () => {
  const rows = [user(1), turn("t1"), reply("t1", "i1"), user(2), turn("t2"), reply("t2", "i9")];
  assert.equal(replyStartIndex(T, rows), 5);
});

test("picks the first row of a reply split over several rows", () => {
  const rows = [user(1), reply("t1", "i1"), user(2), turn("t2"), reply("t2", "i8"), reply("t2", "i9")];
  assert.equal(replyStartIndex(T, rows), 4);
});

test("does not join replies from different turns", () => {
  const rows = [reply("t1", "i1"), reply("t2", "i2")];
  assert.equal(replyStartIndex(T, rows), 1);
});

test("returns -1 without an assistant row", () => {
  assert.equal(replyStartIndex(T, [user(1), turn("t1")]), -1);
});

const test = require("node:test");
const assert = require("node:assert/strict");

const { applyGenerationTask, normalizeSongResult } = require("../Core/domain/generation-task");

test("normalizes missing lyrics without changing transport code", () => {
  const song = normalizeSongResult({ id: "song-1", diary: "下班时看见晚霞", moodKey: "calm" });
  assert.equal(song.id, "song-1");
  assert.ok(song.title);
  assert.ok(song.lyrics.length > 0);
});

test("applies completed generation to domain state", () => {
  const state = { generatedSongs: [], pendingGeneration: { diary: "晚霞", mood: "calm" } };
  applyGenerationTask(state, { ok: true, task: { status: "completed", song: { id: "song-2", diary: "晚霞", lyrics: ["晚霞"] } } });
  assert.equal(state.currentSongId, "song-2");
  assert.equal(state.generationStage, "choice");
  assert.equal(state.progress, 100);
});

test("clears pending identifiers after a failed task", () => {
  const state = { generationTaskId: "task-1", pendingGeneration: { diary: "x" } };
  applyGenerationTask(state, { ok: true, task: { status: "failed" } });
  assert.equal(state.generationStage, "error");
  assert.equal(state.generationTaskId, "");
  assert.equal(state.pendingGeneration, null);
});

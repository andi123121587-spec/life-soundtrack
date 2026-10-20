const test = require("node:test");
const assert = require("node:assert/strict");

const memory = new Map();
global.wx = {
  getStorageSync(key) { return memory.get(key); },
  setStorageSync(key, value) { memory.set(key, value); },
};

const state = require("../utils/state");
const coreState = require("../Core/models/state");
const { migrateState, CURRENT_SCHEMA_VERSION } = require("../Core/models/state-migrations");

test.beforeEach(() => memory.clear());

test("migrates legacy state explicitly", () => {
  assert.deepEqual(migrateState({ progress: 42, isPlaying: true }), {
    progress: 31,
    isPlaying: false,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });
});

test("loads defaults and persists updates through one storage key", () => {
  assert.equal(state.loadState().schemaVersion, CURRENT_SCHEMA_VERSION);
  state.updateState((draft) => {
    draft.currentMood = "happy";
    return draft;
  });
  assert.equal(state.loadState().currentMood, "happy");
  assert.equal(memory.size, 1);
  assert.ok(memory.has(state.STORAGE_KEY));
});

test("removes all local references to a song", () => {
  const draft = coreState.defaultState();
  draft.generatedSongs = [{ id: "song-9" }];
  draft.savedSongIds.push("song-9");
  draft.favoriteSongs.push("song-9");
  state.removeSongFromState(draft, "song-9");
  assert.equal(draft.generatedSongs.length, 0);
  assert.ok(draft.deletedSongIds.includes("song-9"));
  assert.ok(!draft.savedSongIds.includes("song-9"));
  assert.ok(!draft.favoriteSongs.includes("song-9"));
});

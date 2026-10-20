const test = require("node:test");
const assert = require("node:assert/strict");

const service = require("../Core/domain/song-detail");

test("builds detail state without mutating the song", () => {
  const source = { id: "song-1", lyrics: ["原句"], sensitive: true };
  const detail = service.buildSongDetail({ favoriteSongs: ["song-1"], privateSongIds: [], handledWarningSongIds: [] }, source, { defaultTweaks: [] });
  assert.equal(detail.liked, true);
  assert.equal(detail.showWarning, true);
  assert.notEqual(detail.song.lyrics, source.lyrics);
});

test("replaces one lyric and records warning handling", () => {
  const state = {};
  const result = service.replaceLyric(state, { id: "song-1", lyrics: ["A", "B"] }, 1, "C");
  assert.deepEqual(result.song.lyrics, ["A", "C"]);
  assert.deepEqual(result.state.customLyrics["song-1"], ["A", "C"]);
  assert.ok(result.state.handledWarningSongIds.includes("song-1"));
});

test("updates privacy in local domain state", () => {
  const state = { privateSongIds: [], generatedSongs: [{ id: "song-1", private: false }] };
  service.setSongPrivacy(state, "song-1", true);
  assert.deepEqual(state.privateSongIds, ["song-1"]);
  assert.equal(state.generatedSongs[0].private, true);
});

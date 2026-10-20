const test = require("node:test");
const assert = require("node:assert/strict");

const { deleteSongConsistently } = require("../Services/database/song-actions");

test("commits local deletion only after remote deletion succeeds", async () => {
  const events = [];
  await deleteSongConsistently({
    songId: "song-1",
    deleteRemote: async () => { events.push("remote"); },
    stopPlayback: () => { events.push("stop"); },
    removeLocal: () => { events.push("local"); },
  });
  assert.deepEqual(events, ["remote", "stop", "local"]);
});

test("preserves playback and local data when remote deletion fails", async () => {
  const events = [];
  await assert.rejects(() => deleteSongConsistently({
    songId: "song-1",
    deleteRemote: async () => { events.push("remote"); throw new Error("offline"); },
    stopPlayback: () => { events.push("stop"); },
    removeLocal: () => { events.push("local"); },
  }), /offline/);
  assert.deepEqual(events, ["remote"]);
});

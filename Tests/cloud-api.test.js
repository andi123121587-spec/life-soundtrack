const test = require("node:test");
const assert = require("node:assert/strict");

const calls = [];
global.wx = {
  cloud: {
    async callFunction(input) { calls.push(input); return { result: { ok: true, value: input.name } }; },
    async getTempFileURL(input) { calls.push(input); return { fileList: [{ tempFileURL: "https://audio.test/song.mp3" }] }; },
  },
};

const cloudApi = require("../Services/api/cloud-api");

test.beforeEach(() => { calls.length = 0; });

test("keeps cloud function transport separate from business state", async () => {
  const result = await cloudApi.startGeneration({ diary: "今天很好" });
  assert.deepEqual(result, { ok: true, value: "startGeneration" });
  assert.deepEqual(calls[0], { name: "startGeneration", data: { diary: "今天很好" } });
});

test("maps delete parameters consistently", async () => {
  await cloudApi.deleteSong("song-1", "task-1");
  assert.deepEqual(calls[0], { name: "deleteSong", data: { songId: "song-1", taskId: "task-1" } });
});

test("returns a temporary audio URL", async () => {
  assert.equal(await cloudApi.getTempFileUrl("cloud://song"), "https://audio.test/song.mp3");
});

function requireCloud() {
  if (!wx.cloud) throw new Error("当前微信版本不支持云开发");
  return wx.cloud;
}

async function callFunction(name, data = {}) {
  const cloud = requireCloud();
  const response = await cloud.callFunction({ name, data });
  return response.result || {};
}

async function getGenerationTask(taskId) {
  return callFunction("getGenerationTask", { taskId });
}

async function startGeneration(payload) {
  return callFunction("startGeneration", payload);
}

async function listSongs() {
  return callFunction("listSongs");
}

async function deleteSong(songId, taskId = "") {
  return callFunction("deleteSong", { songId: songId || "", taskId: taskId || "" });
}

async function saveGeneratedSong(taskId, songId = "") {
  return callFunction("saveGeneratedSong", { taskId, songId });
}

async function updateSongPrivacy(songId, isPrivate) {
  return callFunction("updateSongPrivacy", { songId, private: Boolean(isPrivate) });
}

async function getTempFileUrl(cloudFileId) {
  const cloud = requireCloud();
  const result = await cloud.getTempFileURL({ fileList: [cloudFileId] });
  return result.fileList?.[0]?.tempFileURL || "";
}

module.exports = {
  requireCloud,
  getGenerationTask,
  startGeneration,
  listSongs,
  deleteSong,
  saveGeneratedSong,
  updateSongPrivacy,
  getTempFileUrl,
};

const { loadState, updateState } = require("../../utils/state");
const cloudApi = require("../api/cloud-api");
const { normalizeGeneratedSong } = require("../ai/generation-adapter");
const { applyGenerationTask } = require("../../Core/domain/generation-task");

function classifyCloudError(error, operation = "generate") {
  const raw = String(error?.errMsg || error?.message || "");
  const message = raw.toLowerCase();
  const suffix = operation === "save" ? "保存" : operation === "delete" ? "删除" : "重新生成";
  if (/timeout|timedout|-501002|超时/.test(message)) return { category: "timeout", title: "等待时间较长", message: `本次请求暂未完成，请稍后再${suffix}，原始草稿仍然保留。` };
  if (/network|request:fail|internet|dns|socket|econn|断网|网络/.test(message)) return { category: "network", title: "网络连接中断", message: `请检查网络后再${suffix}，原始草稿仍然保留。` };
  if (/429|500|502|503|504|busy|internal server|rate.?limit|too many|frequent|繁忙|频繁|限流|拥挤/.test(message)) return { category: "busy", title: "音乐服务繁忙", message: `服务当前请求较多，请稍后再${suffix}，原始草稿仍然保留。` };
  if (/functionname|not found|minimax_api_key|secret|unauthorized|forbidden|额度|balance/.test(message)) return { category: "service", title: "音乐服务暂不可用", message: "服务配置或额度暂不可用，原始草稿仍然保留，请稍后再试。" };
  const clean = raw.replace(/^cloud\.callFunction:fail\s*/, "").trim();
  return { category: "unknown", title: operation === "generate" ? "这次创作没有完成" : `${suffix}没有完成`, message: clean && !/[A-Za-z_$]{5,}/.test(clean) ? clean : `暂时无法完成${suffix}，请稍后重试。` };
}

function friendlyCloudError(error, operation = "generate") {
  const detail = classifyCloudError(error, operation);
  const friendly = new Error(detail.message);
  friendly.category = detail.category;
  friendly.title = detail.title;
  return friendly;
}

function updateGenerationTaskState(result, payload = {}) {
  const task = result?.task;
  if (!result?.ok || !task) return result;
  const payloadForTask = loadState().pendingGeneration || payload || {};
  updateState((state) => applyGenerationTask(state, result, payloadForTask));
  if (task.status !== "completed" || !task.song) return result;
  return { ...result, task: { ...task, song: normalizeGeneratedSong(task.song, payloadForTask), status: "completed" } };
}

async function getGenerationTask(taskId) {
  if (!wx.cloud) return { ok: false, message: "当前微信版本不支持云开发" };
  return cloudApi.getGenerationTask(taskId);
}

async function syncGenerationTask(taskId, payload = {}) {
  const result = await getGenerationTask(taskId);
  if (!result.ok) return result;
  return updateGenerationTaskState(result, payload);
}

async function generateMusic(payload) {
  if (!wx.cloud) throw new Error("当前微信版本不支持云开发");
  let taskId = "";
  try {
    const started = await cloudApi.startGeneration(payload);
    if (!started.ok) throw new Error(started.message || "无法启动音乐生成");
    taskId = started.taskId;
    updateState((state) => { state.generationTaskId = taskId; return state; });
    for (let attempt = 0; attempt < 75; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const result = await syncGenerationTask(taskId, payload);
      if (!result.ok) throw new Error(result.message || "查询生成进度失败");
      if (result.task?.status === "completed") return { ok: true, song: normalizeGeneratedSong(result.task.song, payload), persistenceWarning: result.task.persistenceWarning };
      if (result.task?.status === "failed") throw new Error(result.task.message || "音乐生成失败");
    }
    return { ok: false, pending: true, taskId, message: "云端生成仍在继续，请稍后在首页或歌单查看" };
  } catch (error) {
    const friendly = friendlyCloudError(error, "generate");
    if (taskId && friendly.category === "timeout") return { ok: false, pending: true, taskId, message: "网络响应较慢，任务仍在后台生成，请稍后从首页继续查看" };
    throw friendly;
  }
}

async function refreshAudioUrl(song) {
  if (!song?.cloudFileId || !wx.cloud) return song;
  try {
    const audioSrc = await cloudApi.getTempFileUrl(song.cloudFileId);
    return audioSrc ? { ...song, audioSrc } : song;
  } catch (error) {
    console.warn("刷新云存储播放地址失败", error);
    return song;
  }
}

async function listSongs() {
  if (!wx.cloud) return [];
  const result = await cloudApi.listSongs();
  if (!result.ok) throw new Error(result.message || "读取云端歌单失败");
  return result.songs || [];
}

async function deleteSong(songId) {
  if (!wx.cloud || !songId?.startsWith("song-")) return;
  try {
    const result = await cloudApi.deleteSong(songId);
    if (!result.ok) throw new Error(result.message || "删除云端歌曲失败");
  } catch (error) {
    throw friendlyCloudError(error, "delete");
  }
}

async function saveGeneratedSong(taskId, songId) {
  if (!wx.cloud) throw new Error("当前微信版本不支持云开发");
  if (!taskId) throw new Error("没有找到待保存的生成结果，请重新生成");
  try {
    const result = await cloudApi.saveGeneratedSong(taskId, songId || "");
    if (!result.ok) throw new Error(result.message || "保存歌曲失败");
    return result;
  } catch (error) {
    throw friendlyCloudError(error, "save");
  }
}

async function discardGeneratedSong(taskId, songId) {
  if (!wx.cloud) throw new Error("当前微信版本不支持云开发");
  try {
    const result = await cloudApi.deleteSong(songId || "", taskId || "");
    if (!result.ok) throw new Error(result.message || "删除生成结果失败");
    return result;
  } catch (error) {
    throw friendlyCloudError(error, "delete");
  }
}

async function updateSongPrivacy(songId, isPrivate) {
  if (!wx.cloud || !songId?.startsWith("song-")) return { ok: true, private: Boolean(isPrivate), localOnly: true };
  try {
    const result = await cloudApi.updateSongPrivacy(songId, isPrivate);
    if (!result.ok) throw new Error(result.message || "私密状态同步失败");
    return result;
  } catch (error) {
    throw friendlyCloudError(error, "save");
  }
}

module.exports = { generateMusic, refreshAudioUrl, listSongs, deleteSong, saveGeneratedSong, discardGeneratedSong, updateSongPrivacy, getGenerationTask, syncGenerationTask, classifyCloudError };

const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const songId = String(event.songId || "");
  const taskId = String(event.taskId || "");
  if (!songId && !taskId) return { ok: false, message: "缺少歌曲或任务 ID" };
  try {
    let cloudFileId = "";
    if (taskId) {
      const tasks = await db.collection("generation_tasks").where({ _openid: OPENID, taskId }).limit(1).get();
      const task = tasks.data?.[0];
      cloudFileId = task?.song?.cloudFileId || "";
      if (task?._id) await db.collection("generation_tasks").doc(task._id).remove();
    }
    if (songId) {
      const result = await db.collection("songs").where({ _openid: OPENID, id: songId }).limit(1).get();
      const song = result.data?.[0];
      cloudFileId = song?.cloudFileId || cloudFileId;
      if (song?._id) await db.collection("songs").doc(song._id).remove();
      const diaries = await db.collection("diaries").where({ _openid: OPENID, songId }).get();
      await Promise.all((diaries.data || []).map((diary) => db.collection("diaries").doc(diary._id).remove()));
    }
    if (cloudFileId) await cloud.deleteFile({ fileList: [cloudFileId] });
    return { ok: true };
  } catch (error) {
    console.error("deleteSong failed", error);
    return { ok: false, message: error.message || "删除云端歌曲失败" };
  }
};

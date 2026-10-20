const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const taskId = String(event.taskId || "");
  const songId = String(event.songId || "");
  if (!OPENID || !taskId) return { ok: false, message: "没有找到待保存的生成结果" };

  try {
    const tasks = await db.collection("generation_tasks").where({ _openid: OPENID, taskId }).limit(1).get();
    const task = tasks.data?.[0];
    if (!task && songId) {
      const savedSongs = await db.collection("songs").where({ _openid: OPENID, id: songId }).limit(1).get();
      if (savedSongs.data?.[0]) return { ok: true, song: savedSongs.data[0], alreadySaved: true };
    }
    if (!task || task.status !== "completed" || !task.song) {
      return { ok: false, message: "生成结果尚未完成或已经失效" };
    }

    const song = { ...task.song, _openid: OPENID };
    const existingDiaries = await db.collection("diaries").where({ _openid: OPENID, songId: song.id }).limit(1).get();
    const existingSongs = await db.collection("songs").where({ _openid: OPENID, id: song.id }).limit(1).get();
    let createdDiaryId = "";
    let createdSongId = "";
    if (!existingDiaries.data?.length) {
      const createdDiary = await db.collection("diaries").add({
        data: {
          _openid: OPENID,
          diary: song.diary || task.diary || "",
          moodKey: song.moodKey || task.mood || "calm",
          private: Boolean(song.private),
          songId: song.id,
          createdAt: db.serverDate(),
        },
      });
      createdDiaryId = createdDiary._id || "";
    }
    if (!existingSongs.data?.length) {
      try {
        const createdSong = await db.collection("songs").add({ data: { ...song, createdAt: db.serverDate() } });
        createdSongId = createdSong._id || "";
      } catch (error) {
        if (createdDiaryId) await db.collection("diaries").doc(createdDiaryId).remove().catch(() => {});
        throw error;
      }
    }

    try {
      await db.collection("generation_tasks").doc(task._id).remove();
    } catch (error) {
      if (createdSongId) await db.collection("songs").doc(createdSongId).remove().catch(() => {});
      if (createdDiaryId) await db.collection("diaries").doc(createdDiaryId).remove().catch(() => {});
      throw error;
    }
    return { ok: true, song };
  } catch (error) {
    console.error("saveGeneratedSong failed", error);
    return { ok: false, message: error.message || "保存歌曲失败，请稍后重试" };
  }
};

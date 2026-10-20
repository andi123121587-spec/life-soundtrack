const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const songId = String(event.songId || "");
  const isPrivate = Boolean(event.private);
  if (!OPENID || !songId) return { ok: false, message: "没有找到需要更新的歌曲" };

  try {
    const songs = await db.collection("songs").where({ _openid: OPENID, id: songId }).limit(1).get();
    const song = songs.data?.[0];
    if (!song?._id) return { ok: false, message: "歌曲不存在或已经删除" };

    await db.collection("songs").doc(song._id).update({ data: { private: isPrivate, updatedAt: db.serverDate() } });
    const diaries = await db.collection("diaries").where({ _openid: OPENID, songId }).get();
    await Promise.all((diaries.data || []).map((diary) => (
      db.collection("diaries").doc(diary._id).update({ data: { private: isPrivate, updatedAt: db.serverDate() } })
    )));
    return { ok: true, private: isPrivate };
  } catch (error) {
    console.error("updateSongPrivacy failed", error);
    return { ok: false, message: "私密状态同步失败，请稍后重试" };
  }
};

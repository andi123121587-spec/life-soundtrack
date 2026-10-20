const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  try {
    const result = await db.collection("songs").where({ _openid: OPENID }).orderBy("createdAt", "desc").limit(100).get();
    return { ok: true, songs: result.data || [] };
  } catch (error) {
    console.error("listSongs failed", error);
    return { ok: false, message: error.message || "读取云端歌单失败" };
  }
};

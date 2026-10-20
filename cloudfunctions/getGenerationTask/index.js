const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const taskId = String(event.taskId || "");
  if (!OPENID || !taskId) return { ok: false, message: "任务参数无效" };
  try {
    const result = await db.collection("generation_tasks").where({ _openid: OPENID, taskId }).limit(1).get();
    const task = result.data?.[0];
    if (!task) return { ok: false, message: "没有找到生成任务" };
    return { ok: true, task: { status: task.status, song: task.song, message: task.message, persistenceWarning: task.persistenceWarning } };
  } catch (error) {
    console.error("getGenerationTask failed", error);
    return { ok: false, message: "查询生成进度失败" };
  }
};

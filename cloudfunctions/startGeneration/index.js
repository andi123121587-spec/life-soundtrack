const cloud = require("wx-server-sdk");
const tencentcloud = require("tencentcloud-sdk-nodejs-scf");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID, ENV } = cloud.getWXContext();
  const ownerId = OPENID || String(event.ownerId || "");
  const diary = String(event.diary || "").trim().slice(0, 1800);
  const mood = String(event.mood || "calm");
  const secretId = process.env.TENCENTCLOUD_SECRETID;
  const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
  const token = process.env.TENCENTCLOUD_SESSIONTOKEN;
  const namespace = ENV || process.env.TENCENTCLOUD_SCF_NAMESPACE;
  if (!ownerId) return { ok: false, message: "无法识别当前微信用户" };
  if (!diary) return { ok: false, message: "日记内容不能为空" };
  if (!secretId || !secretKey) {
    return { ok: false, message: "云函数尚未配置腾讯云 SCF 调用密钥" };
  }
  if (!namespace) return { ok: false, message: "无法识别当前云函数命名空间" };

  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await db.collection("generation_tasks").add({
      data: {
        _openid: ownerId,
        taskId,
        status: "queued",
        diary,
        mood,
        privateMode: Boolean(event.privateMode),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    });

    const ScfClient = tencentcloud.scf.v20180416.Client;
    const client = new ScfClient({
      credential: {
        secretId,
        secretKey,
        token,
      },
      region: process.env.TENCENTCLOUD_REGION || "ap-shanghai",
      profile: { httpProfile: { endpoint: "scf.tencentcloudapi.com" } },
    });
    const response = await client.Invoke({
      FunctionName: "generateMusic",
      Namespace: namespace,
      InvocationType: "Event",
      ClientContext: JSON.stringify({
        diary,
        mood,
        privateMode: Boolean(event.privateMode),
        variant: Number(event.variant || 0),
        sourceSongId: String(event.sourceSongId || ""),
        ownerId,
        taskId,
      }),
    });
    if (!response?.Result?.InvokeResult && response?.Result?.ErrMsg) throw new Error(response.Result.ErrMsg);
    return { ok: true, taskId };
  } catch (error) {
    console.error("startGeneration failed", error);
    try {
      const task = await db.collection("generation_tasks").where({ _openid: ownerId, taskId }).limit(1).get();
      if (task.data?.[0]?._id) await db.collection("generation_tasks").doc(task.data[0]._id).update({ data: { status: "failed", message: "后台任务启动失败" } });
    } catch (_) {}
    return { ok: false, message: error.message || "后台任务启动失败，请稍后重试" };
  }
};

const cloud = require("wx-server-sdk");
const http = require("http");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const moodMap = {
  happy: { label: "开心", style: "明亮温暖的流行民谣，轻快但不喧闹" },
  calm: { label: "平静", style: "安静治愈的独立民谣，钢琴与木吉他，柔和人声" },
  sad: { label: "难过", style: "克制忧郁的抒情民谣，慢板，温柔人声" },
  release: { label: "释然", style: "从低沉渐渐走向明亮的治愈流行，舒展人声" },
  excited: { label: "激动", style: "充满希望的轻摇滚流行，节奏鲜明，明亮人声" },
};

function requestJson(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        try {
          const data = JSON.parse(text);
          if (res.statusCode < 200 || res.statusCode >= 300) reject(new Error(data?.base_resp?.status_msg || data?.message || `MiniMax HTTP ${res.statusCode}`));
          else resolve(data);
        } catch (error) {
          reject(new Error(`MiniMax 返回了无法解析的数据：${text.slice(0, 120)}`));
        }
      });
    });
    req.setTimeout(240000, () => req.destroy(new Error("MiniMax 生成超过 4 分钟，请稍后重试")));
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function download(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 4) return reject(new Error("音频下载重定向次数过多"));
    const transport = String(url).startsWith("http:") ? http : https;
    transport.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return download(new URL(res.headers.location, url).toString(), redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`音频下载失败：HTTP ${res.statusCode}`));
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

const moodFallbackLines = {
  happy: ["把光装进口袋", "让笑意慢慢铺开", "今天值得被唱出来"],
  calm: ["风把夜色放轻", "心跳慢慢安静", "我在微光里听见自己"],
  sad: ["把难过轻轻放下", "让沉默替我说话", "等明天再慢慢回答"],
  release: ["旧风吹过以后", "我把执念松开", "让心重新亮起来"],
  excited: ["脚步追上心跳", "热望穿过街角", "把今天唱得更高"],
};

function splitDiary(diary) {
  return String(diary || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/[。！？!?；;，,\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function compactLine(line, limit = 18) {
  const value = String(line || "").trim();
  return value.length > limit ? value.slice(0, limit - 1) : value;
}

function lyricizeDiary(diary, moodKey, variant = 0) {
  const parts = splitDiary(diary);
  const fallback = moodFallbackLines[moodKey] || moodFallbackLines.calm;
  const offset = parts.length ? variant % parts.length : 0;
  const rotated = parts.slice(offset).concat(parts.slice(0, offset));
  const body = rotated.slice(0, 4).map((line) => compactLine(line));
  const source = body.length ? body : fallback;
  return [
    "[主歌]",
    ...source.slice(0, 2),
    fallback[variant % fallback.length],
    "[副歌]",
    ...source.slice(2, 4),
    fallback[(variant + 1) % fallback.length],
    fallback[(variant + 2) % fallback.length],
  ].filter(Boolean).slice(0, 10);
}

function linesFromResult(result, diary) {
  const value = result?.analysis_info?.lyrics || result?.data?.lyrics || result?.lyrics;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    const lines = value.split("\n").map((line) => line.replace(/^\[[^\]]+\]\s*/, "").trim()).filter(Boolean);
      if (lines.length) return lines;
  }
  return [];
}

function findAudioUrl(result) {
  return result?.data?.audio_url || result?.data?.url || result?.audio_url || result?.url || (String(result?.data?.audio || "").startsWith("http") ? result.data.audio : "");
}

function coverForSong(seed) {
  const covers = ["night-desk", "rainy-way-home", "desk-window", "special-day", "friend-cover", "weekly-review"];
  const value = String(seed || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `/assets/illustrations/${covers[value % covers.length]}.png`;
}

exports.main = async (event) => {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return { ok: false, message: "云函数尚未配置 MINIMAX_API_KEY" };
  const diary = String(event.diary || "").trim().slice(0, 1800);
  const moodKey = moodMap[event.mood] ? event.mood : "calm";
  const mood = moodMap[moodKey];
  const variant = Number(event.variant || 0);
  if (!diary) return { ok: false, message: "日记内容不能为空" };
  const context = cloud.getWXContext();
  const ownerId = context.OPENID || event.ownerId || "admin-smoke-test";
  const taskId = String(event.taskId || "");

  async function updateTask(data) {
    if (!taskId) return;
    try {
      const result = await db.collection("generation_tasks").where({ _openid: ownerId, taskId }).limit(1).get();
      if (result.data?.[0]?._id) await db.collection("generation_tasks").doc(result.data[0]._id).update({ data });
    } catch (error) {
      console.error("update generation task failed", error);
    }
  }

  try {
    await updateTask({ status: "generating", updatedAt: db.serverDate() });
    const prompt = `${mood.style}。将这段中文日记的核心情绪写成完整歌曲，避免暴露具体个人隐私。请输出与旧版本有明显差异的第 ${variant + 1} 个版本，包含主歌和副歌结构：${diary}`;
    const result = await requestJson("https://api.minimaxi.com/v1/music_generation", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    }, {
      model: process.env.MINIMAX_MUSIC_MODEL || "music-2.6-free",
      prompt,
      lyrics_optimizer: true,
      stream: false,
      output_format: "url",
      audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
      aigc_watermark: true,
    });

    const statusCode = result?.base_resp?.status_code;
    if (statusCode !== undefined && statusCode !== 0) throw new Error(result.base_resp.status_msg || `MiniMax 错误 ${statusCode}`);
    const sourceUrl = findAudioUrl(result);
    if (!sourceUrl) throw new Error("MiniMax 未返回音频地址，请检查账号是否已开通音乐模型");
    const audio = await download(sourceUrl);
    const id = `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const upload = await cloud.uploadFile({ cloudPath: `users/${ownerId}/music/${id}.mp3`, fileContent: audio });
    const temp = await cloud.getTempFileURL({ fileList: [upload.fileID] });
    const durationMs = Number(result?.extra_info?.music_duration || 0);
    const resultLyrics = linesFromResult(result, diary);
    const now = new Date();
    const song = {
      _openid: ownerId,
      id,
      title: `${diary.replace(/[，。！？!?\n]/g, " ").trim().slice(0, 10) || "未命名心情"}${variant ? ` V${variant + 1}` : ""}`,
      subtitle: "由今天的手记谱写而成",
      mood: mood.label,
      moodKey,
      date: `${now.getMonth() + 1}月${now.getDate()}日`,
      lyrics: resultLyrics.length ? resultLyrics : lyricizeDiary(diary, moodKey, variant),
      diary,
      emotionTag: mood.label,
      styleTag: "AI 原创",
      intensityTag: "情绪旋律",
      coverColor: "#d4c0a0",
      coverImage: coverForSong(`${diary}-${taskId}-${variant}`),
      durationSeconds: durationMs ? Math.round(durationMs / 1000) : 0,
      duration: durationMs ? `${Math.floor(durationMs / 60000)}:${String(Math.round(durationMs / 1000) % 60).padStart(2, "0")}` : "AI 创作",
      cloudFileId: upload.fileID,
      audioSrc: temp.fileList?.[0]?.tempFileURL || "",
      private: Boolean(event.privateMode),
      createdAt: Date.now(),
    };

    await updateTask({ status: "completed", song, saved: false, updatedAt: db.serverDate() });
    return { ok: true, song };
  } catch (error) {
    console.error("generateMusic failed", error);
    await updateTask({ status: "failed", message: error.message || "音乐生成失败", updatedAt: db.serverDate() });
    return { ok: false, message: error.message || "音乐生成失败" };
  }
};

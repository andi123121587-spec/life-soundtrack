const moodLines = {
  happy: ["把光装进口袋", "让笑意慢慢铺开", "今天值得被唱出来"],
  calm: ["风把夜色放轻", "心跳慢慢安静", "我在微光里听见自己"],
  sad: ["把难过轻轻放下", "让沉默替我说话", "等明天再慢慢回答"],
  release: ["旧风吹过以后", "我把执念松开", "让心重新亮起来"],
  excited: ["脚步追上心跳", "热望穿过街角", "把今天唱得更高"],
};
const variantOpeners = ["主歌", "副歌", "桥段", "尾声"];

function normalizeDiary(diary) {
  return String(diary || "").replace(/\s+/g, " ").replace(/[“”"']/g, "").trim();
}

function splitDiary(diary) {
  const normalized = normalizeDiary(diary);
  const parts = normalized.split(/[。！？!?；;，,\n]+/).map((line) => line.trim()).filter(Boolean);
  return parts.length ? parts : (normalized ? [normalized] : []);
}

function compactLine(line, limit = 18) {
  const value = String(line || "").trim();
  return value.length <= limit ? value : value.slice(0, limit - 1);
}

function lyricizeDiary(diary, moodKey = "calm", options = {}) {
  const parts = splitDiary(diary);
  const moodFallback = moodLines[moodKey] || moodLines.calm;
  const variant = Number(options.variant || 0);
  const rotated = parts.length ? parts.slice(variant % parts.length).concat(parts.slice(0, variant % parts.length)) : [];
  const body = rotated.slice(0, 4).map((line) => compactLine(line));
  const source = body.length ? body : moodFallback;
  const lines = [`[${variantOpeners[variant % variantOpeners.length]}]`, ...source.slice(0, 2), moodFallback[variant % moodFallback.length], "[副歌]", ...source.slice(2, 4), moodFallback[(variant + 1) % moodFallback.length], moodFallback[(variant + 2) % moodFallback.length]].filter(Boolean);
  return Array.from(new Set(lines)).slice(0, 10);
}

function titleFromDiary(diary, fallback = "未命名心情") {
  const first = splitDiary(diary)[0] || fallback;
  return compactLine(first.replace(/[^\u4e00-\u9fa5A-Za-z0-9 ]/g, ""), 12) || fallback;
}

module.exports = { lyricizeDiary, titleFromDiary };

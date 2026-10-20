const { CURRENT_SCHEMA_VERSION, migrateState } = require("./state-migrations");

function defaultState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentMood: "sad",
    currentSongId: "entry-1",
    currentLibrarySongId: "song-2",
    isPlaying: false,
    privateMode: false,
    selectedPrompt: "每日小记",
    draftContent: "",
    selectedTab: "lyrics",
    showAdjustPanel: false,
    showRewritePanel: false,
    progress: 31,
    songProgress: { "entry-1": 31 },
    generationStage: "loading",
    favoriteSongs: ["entry-1"],
    customLyrics: {},
    savedTweaks: {},
    currentInstrument: "弦乐",
    savedSongIds: ["entry-1", "entry-2", "entry-3", "entry-4", "entry-5"],
    deletedSongIds: [],
    privateSongIds: [],
    handledWarningSongIds: [],
    generatedSongs: [],
    pendingGeneration: null,
    generationTaskId: "",
    libraryFilter: "all",
  };
}

function mergeState(saved) {
  if (!saved || typeof saved !== "object") return defaultState();
  const migrated = migrateState(saved);
  const defaults = defaultState();
  return {
    ...defaults,
    ...migrated,
    favoriteSongs: Array.isArray(migrated.favoriteSongs) ? migrated.favoriteSongs : defaults.favoriteSongs,
    savedSongIds: Array.isArray(migrated.savedSongIds) ? migrated.savedSongIds : defaults.savedSongIds,
    deletedSongIds: Array.isArray(migrated.deletedSongIds) ? migrated.deletedSongIds : [],
    privateSongIds: Array.isArray(migrated.privateSongIds) ? migrated.privateSongIds : [],
    handledWarningSongIds: Array.isArray(migrated.handledWarningSongIds) ? migrated.handledWarningSongIds : [],
    generatedSongs: Array.isArray(migrated.generatedSongs) ? migrated.generatedSongs : [],
    songProgress: migrated.songProgress && typeof migrated.songProgress === "object" ? migrated.songProgress : defaults.songProgress,
    generationTaskId: typeof migrated.generationTaskId === "string" ? migrated.generationTaskId : "",
  };
}

function clampProgress(progress) {
  const value = Number(progress);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getSongProgress(state, songId, fallback = 0) {
  if (songId && state.songProgress && Number.isFinite(Number(state.songProgress[songId]))) {
    return clampProgress(state.songProgress[songId]);
  }
  if (songId && state.currentSongId === songId && Number.isFinite(Number(state.progress))) {
    return clampProgress(state.progress);
  }
  return clampProgress(fallback);
}

function setSongProgress(state, songId, progress) {
  if (!songId) return state;
  const value = clampProgress(progress);
  state.songProgress = { ...(state.songProgress || {}), [songId]: value };
  if (state.currentSongId === songId) state.progress = value;
  return state;
}

function removeSongFromState(state, songId, options = {}) {
  if (!songId) return state;
  const rememberDeleted = options.rememberDeleted !== false;
  state.savedSongIds = (state.savedSongIds || []).filter((id) => id !== songId);
  if (rememberDeleted) state.deletedSongIds = Array.from(new Set([...(state.deletedSongIds || []), songId]));
  state.favoriteSongs = (state.favoriteSongs || []).filter((id) => id !== songId);
  state.privateSongIds = (state.privateSongIds || []).filter((id) => id !== songId);
  state.handledWarningSongIds = (state.handledWarningSongIds || []).filter((id) => id !== songId);
  state.generatedSongs = (state.generatedSongs || []).filter((song) => song.id !== songId);
  if (state.customLyrics) delete state.customLyrics[songId];
  if (state.savedTweaks) delete state.savedTweaks[songId];
  if (state.songProgress) delete state.songProgress[songId];
  if (state.currentSongId === songId) {
    state.currentSongId = (state.savedSongIds || [])[0] || "";
    state.currentLibrarySongId = "";
    state.progress = 0;
  }
  if (state.currentLibrarySongId === `library-${songId}`) state.currentLibrarySongId = "";
  state.isPlaying = false;
  state.showAdjustPanel = false;
  state.showRewritePanel = false;
  return state;
}

function getGenerationStatus(state) {
  const stage = state?.generationStage || "idle";
  const pending = state?.pendingGeneration || null;
  if (stage === "loading" && pending?.diary) {
    return { active: true, stage: "loading", title: "正在后台生成", subtitle: "你可以先去其他页面，完成后再回来查看结果。", progress: clampProgress(state?.progress || 26), actionLabel: "继续查看" };
  }
  if ((stage === "result" || stage === "choice") && state?.currentSongId) {
    return { active: true, stage, title: stage === "choice" ? "生成已完成" : "歌曲已完成", subtitle: stage === "choice" ? "结果页等你决定留下还是不保留。" : "点进去看看这首新歌。", progress: 100, actionLabel: stage === "choice" ? "去做选择" : "查看结果" };
  }
  return { active: false, stage: "idle", progress: 0 };
}

module.exports = { CURRENT_SCHEMA_VERSION, defaultState, mergeState, removeSongFromState, getSongProgress, setSongProgress, getGenerationStatus };

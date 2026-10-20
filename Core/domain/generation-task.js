const { lyricizeDiary, titleFromDiary } = require("./lyric-generator");
const { getLibraryIdForSong } = require("../models/songs");

function normalizeSongResult(song, payload = {}) {
  if (!song) return song;
  const diary = song.diary || payload.diary || "";
  const lyrics = Array.isArray(song.lyrics) ? song.lyrics.filter(Boolean) : [];
  return {
    ...song,
    title: song.title || titleFromDiary(diary),
    lyrics: lyrics.length ? lyrics : lyricizeDiary(diary, song.moodKey || payload.mood, { variant: Number(payload.variant || 0) }),
    coverImage: song.coverImage || "/assets/illustrations/night-desk.png",
  };
}

function applyGenerationTask(state, result, payload = {}, options = {}) {
  const task = result?.task;
  if (!result?.ok || !task) return state;
  if (task.status === "completed" && task.song) {
    const pending = state.pendingGeneration || payload || {};
    const song = normalizeSongResult(task.song, pending);
    state.generatedSongs = [song, ...(state.generatedSongs || []).filter((item) => item.id !== song.id)];
    state.currentSongId = song.id;
    state.currentLibrarySongId = getLibraryIdForSong(song.id, options.librarySongs || []);
    state.generationStage = "choice";
    state.progress = 100;
    state.pendingGeneration = pending;
  } else if (task.status === "failed") {
    state.generationStage = "error";
    state.pendingGeneration = null;
    state.generationTaskId = "";
  }
  return state;
}

module.exports = { normalizeSongResult, applyGenerationTask };

const { getAllSongs, getLibraryIdForSong } = require("../models/songs");
const { getSongProgress, setSongProgress } = require("../models/state");

function buildSongDetail(state, sourceSong, options = {}) {
  if (!sourceSong) return null;
  const customLyrics = state.customLyrics?.[sourceSong.id];
  const song = { ...sourceSong, lyrics: customLyrics || (sourceSong.lyrics || []).slice() };
  return {
    song,
    progress: getSongProgress(state, sourceSong.id, sourceSong.id === "entry-1" ? 31 : 0),
    liked: (state.favoriteSongs || []).includes(song.id),
    isPrivate: Boolean(song.private) || (state.privateSongIds || []).includes(song.id),
    showWarning: Boolean(song.sensitive) && !(state.handledWarningSongIds || []).includes(song.id) && !(state.privateSongIds || []).includes(song.id),
    savedTweaks: state.savedTweaks?.[sourceSong.id] || options.defaultTweaks,
  };
}

function toggleFavorite(state, songId) {
  const favorites = state.favoriteSongs || [];
  state.favoriteSongs = favorites.includes(songId) ? favorites.filter((id) => id !== songId) : favorites.concat(songId);
  return state;
}

function selectAdjacentSong(state, currentSongId, offset, shuffle = false, options = {}) {
  const queue = getAllSongs(state, options).filter((item) => (state.savedSongIds || []).includes(item.id) && !(state.deletedSongIds || []).includes(item.id));
  if (!queue.length) return null;
  const index = Math.max(0, queue.findIndex((item) => item.id === currentSongId));
  const randomIndex = queue.length > 1 ? (index + 1 + Math.floor(Math.random() * (queue.length - 1))) % queue.length : 0;
  const nextSong = queue[shuffle ? randomIndex : (index + offset + queue.length) % queue.length];
  state.currentSongId = nextSong.id;
  state.currentLibrarySongId = getLibraryIdForSong(nextSong.id, options.librarySongs || []);
  setSongProgress(state, nextSong.id, 0);
  return nextSong;
}

function saveSongTweaks(state, songId, tweaks, instrument) {
  state.savedTweaks = { ...(state.savedTweaks || {}), [songId]: tweaks };
  state.currentInstrument = instrument;
  state.showAdjustPanel = false;
  return state;
}

function setSongPrivacy(state, songId, isPrivate) {
  const ids = state.privateSongIds || [];
  state.privateSongIds = isPrivate ? Array.from(new Set([...ids, songId])) : ids.filter((id) => id !== songId);
  state.generatedSongs = (state.generatedSongs || []).map((song) => song.id === songId ? { ...song, private: isPrivate } : song);
  return state;
}

function replaceLyric(state, song, lineIndex, text) {
  const lyrics = (song.lyrics || []).slice();
  lyrics[lineIndex] = text;
  state.customLyrics = { ...(state.customLyrics || {}), [song.id]: lyrics };
  state.showRewritePanel = false;
  state.handledWarningSongIds = Array.from(new Set([...(state.handledWarningSongIds || []), song.id]));
  return { state, song: { ...song, lyrics } };
}

function prepareRegeneration(state, song, isPrivate, options = {}) {
  const siblingCount = (state.generatedSongs || []).filter((item) => item.diary === song.diary).length;
  state.draftContent = song.diary;
  state.currentMood = song.moodKey;
  state.currentSongId = song.id;
  state.currentLibrarySongId = getLibraryIdForSong(song.id, options.librarySongs || []);
  state.generationStage = "loading";
  state.progress = 0;
  state.pendingGeneration = { diary: song.diary, mood: song.moodKey, privateMode: isPrivate, variant: siblingCount + 1, sourceSongId: song.id };
  return state;
}

module.exports = { buildSongDetail, toggleFavorite, selectAdjacentSong, saveSongTweaks, setSongPrivacy, replaceLyric, prepareRegeneration };

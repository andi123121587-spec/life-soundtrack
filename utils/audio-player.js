const { loadState, updateState, getSongProgress, setSongProgress } = require("./state");

let audioContext = null;
let currentSource = "";
let simulationTimer = null;
let simulationDuration = 0;
let simulationActive = false;
const listeners = new Set();

function clearSimulationTimer() {
  if (simulationTimer) clearInterval(simulationTimer);
  simulationTimer = null;
}

function startSimulationTimer() {
  clearSimulationTimer();
  simulationTimer = setInterval(() => {
    const state = loadState();
    if (!state.isPlaying || !simulationDuration) {
      clearSimulationTimer();
      return;
    }
    const songId = state.currentSongId;
    let progress = getSongProgress(state, songId, 0) + 50 / simulationDuration;
    let isPlaying = true;
    if (progress >= 100) {
      if (state.repeat) progress = 0;
      else {
        progress = 100;
        isPlaying = false;
        clearSimulationTimer();
      }
    }
    updateState((next) => {
      setSongProgress(next, next.currentSongId, progress);
      next.isPlaying = isPlaying;
      return next;
    });
    emit({
      currentTime: progress / 100 * simulationDuration,
      duration: simulationDuration,
      simulated: true,
      ended: !isPlaying,
    });
  }, 500);
}

function toggleSimulation(song) {
  if (!song) return { ok: false, reason: "missing-song" };
  if (audioContext && !audioContext.paused) audioContext.stop();
  currentSource = "";
  simulationActive = true;
  simulationDuration = Number(song.durationSeconds || 134);
  const state = loadState();
  const isCurrent = state.currentSongId === song.id;
  const isPlaying = isCurrent ? !state.isPlaying : true;
  const progress = isCurrent ? getSongProgress(state, song.id, 0) : 0;
  updateState((next) => {
    next.currentSongId = song.id;
    next.currentLibrarySongId = song.libraryId || next.currentLibrarySongId;
    next.isPlaying = isPlaying;
    setSongProgress(next, song.id, progress);
    return next;
  });
  if (isPlaying) startSimulationTimer();
  else clearSimulationTimer();
  emit({ currentTime: progress / 100 * simulationDuration, duration: simulationDuration, simulated: true });
  return { ok: true, simulated: true };
}

function snapshot(extra = {}) {
  const state = loadState();
  return {
    isPlaying: Boolean(state.isPlaying),
    progress: getSongProgress(state, state.currentSongId, 0),
    currentSongId: state.currentSongId,
    ...extra,
  };
}

function emit(extra) {
  const value = snapshot(extra);
  listeners.forEach((listener) => listener(value));
  return value;
}

function ensureContext() {
  if (audioContext || typeof wx.createInnerAudioContext !== "function") return audioContext;
  audioContext = wx.createInnerAudioContext();
  audioContext.obeyMuteSwitch = false;
  audioContext.onPlay(() => {
    updateState((state) => ({ ...state, isPlaying: true }));
    emit();
  });
  audioContext.onPause(() => {
    updateState((state) => ({ ...state, isPlaying: false }));
    emit();
  });
  audioContext.onStop(() => {
    updateState((state) => ({ ...state, isPlaying: false }));
    emit();
  });
  audioContext.onEnded(() => {
    const state = loadState();
    if (state.repeat && currentSource) {
      audioContext.seek(0);
      audioContext.play();
      updateState((next) => {
        setSongProgress(next, next.currentSongId, 0);
        next.isPlaying = true;
        return next;
      });
      emit({ repeated: true });
      return;
    }
    updateState((next) => {
      setSongProgress(next, next.currentSongId, 100);
      next.isPlaying = false;
      return next;
    });
    emit({ ended: true });
  });
  audioContext.onTimeUpdate(() => {
    const duration = Number(audioContext.duration || 0);
    const progress = duration > 0 ? Math.min(100, audioContext.currentTime / duration * 100) : 0;
    updateState((state) => setSongProgress(state, state.currentSongId, progress));
    emit({ currentTime: audioContext.currentTime, duration });
  });
  audioContext.onError(() => {
    updateState((state) => ({ ...state, isPlaying: false }));
    emit({ error: true });
  });
  return audioContext;
}

function setTrack(song) {
  const source = song && song.audioSrc;
  if (!source) return { ok: false, reason: "missing-source" };
  const context = ensureContext();
  if (!context) return { ok: false, reason: "unsupported" };
  const state = loadState();
  const isSameSong = state.currentSongId === song.id && currentSource === source;
  const progress = isSameSong ? getSongProgress(state, song.id, 0) : 0;
  if (currentSource !== source) {
    clearSimulationTimer();
    simulationActive = false;
    context.stop();
    currentSource = source;
    context.src = source;
  }
  updateState((next) => {
    next.currentSongId = song.id;
    next.currentLibrarySongId = song.libraryId || next.currentLibrarySongId;
    setSongProgress(next, song.id, progress);
    return next;
  });
  return { ok: true, context };
}

function toggle(song) {
  if (song && !song.audioSrc) return toggleSimulation(song);
  const prepared = setTrack(song);
  if (!prepared.ok) return prepared;
  if (prepared.context.paused) prepared.context.play();
  else prepared.context.pause();
  return { ok: true };
}

function seek(percent) {
  const value = Math.max(0, Math.min(100, Number(percent || 0)));
  if (simulationActive && simulationDuration) {
    updateState((state) => setSongProgress(state, state.currentSongId, value));
    emit({ currentTime: value / 100 * simulationDuration, duration: simulationDuration, simulated: true });
    return true;
  }
  if (!audioContext || !audioContext.duration) return false;
  audioContext.seek(value / 100 * audioContext.duration);
  return true;
}

function stop() {
  clearSimulationTimer();
  simulationActive = false;
  simulationDuration = 0;
  if (audioContext) audioContext.stop();
  updateState((state) => {
    setSongProgress(state, state.currentSongId, 0);
    state.isPlaying = false;
    return state;
  });
  emit();
}

function subscribe(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

module.exports = { toggle, seek, stop, subscribe, snapshot };

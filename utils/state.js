// Platform adapter: persistence stays here; state rules stay in Core/models/state.
const model = require("../Core/models/state");

const STORAGE_KEY = "emotion_music_diary_prototype_v1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  return model.mergeState(wx.getStorageSync(STORAGE_KEY));
}

function saveState(state) {
  wx.setStorageSync(STORAGE_KEY, clone(state));
  return state;
}

function updateState(mutator) {
  const state = loadState();
  const next = mutator ? mutator(state) || state : state;
  return saveState(next);
}

module.exports = { ...model, STORAGE_KEY, loadState, saveState, updateState };

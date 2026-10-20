const {
  heroScenes,
  recentRecap,
} = require("../../../data/demo-catalog");
const { getGreeting } = require("../../../utils/format");
const { loadState, updateState, getGenerationStatus } = require("../../../utils/state");
const { getLibraryIdForSong } = require("../../../utils/songs");
const { syncGenerationTask } = require("../../../utils/cloud-service");

Page({
  data: {
    greeting: "晚上好",
    userName: "嗨，小林",
    scenes: heroScenes,
    recentRecap,
    playing: false,
    generationStatus: { active: false },
  },

  onShow() {
    const state = loadState();
    this.setData({
      greeting: getGreeting(),
      playing: Boolean(state.isPlaying),
      recentRecap: recentRecap.filter((item) => !(state.deletedSongIds || []).includes(item.id)),
      generationStatus: getGenerationStatus(state),
    });
    this.startGenerationWatcher();
  },

  onHide() {
    this.stopGenerationWatcher();
  },

  onUnload() {
    this.stopGenerationWatcher();
  },

  startGenerationWatcher() {
    this.stopGenerationWatcher();
    this.generationWatcher = setInterval(() => {
      const state = loadState();
      const taskId = state.generationTaskId;
      const status = getGenerationStatus(state);
      if (status.active && status.stage === "loading" && taskId) {
        syncGenerationTask(taskId, state.pendingGeneration).catch((error) => console.warn("同步生成任务失败", error));
      }
      this.setData({ generationStatus: getGenerationStatus(loadState()) });
      if (!status.active) this.stopGenerationWatcher();
    }, 1200);
  },

  stopGenerationWatcher() {
    if (this.generationWatcher) clearInterval(this.generationWatcher);
    this.generationWatcher = null;
  },

  openCompose() {
    wx.navigateTo({ url: "/UI/pages/compose/compose" });
  },

  continueGeneration() {
    const state = loadState();
    if (state.generationStage === "choice" && state.currentSongId) {
      wx.navigateTo({ url: "/UI/pages/diary/diary" });
      return;
    }
    if (state.generationStage === "result" && state.currentSongId) {
      wx.navigateTo({ url: "/UI/pages/music/music" });
      return;
    }
    if (state.generationStage === "loading" && state.pendingGeneration) {
      wx.navigateTo({ url: "/UI/pages/diary/diary" });
    }
  },

  openLibrary() {
    wx.redirectTo({ url: "/UI/pages/me/me" });
  },

  openSong() {
    wx.navigateTo({ url: "/UI/pages/music/music" });
  },

  openScene(event) {
    const scene = this.data.scenes[Number(event.currentTarget.dataset.index)];
    if (!scene) return;
    updateState((state) => {
      state.libraryFilter = scene?.filter || "all";
      if (scene.entryId) {
        state.currentSongId = scene.entryId;
        state.currentLibrarySongId = getLibraryIdForSong(scene.entryId);
        state.selectedTab = "lyrics";
      }
      if (scene.prompt) state.selectedPrompt = scene.prompt;
      return state;
    });
    if (scene.target === "song") {
      this.openSong();
      return;
    }
    if (scene.target === "compose") {
      this.openCompose();
      return;
    }
    this.openLibrary();
  },

  openRecent(event) {
    const { id } = event.currentTarget.dataset;
    updateState((state) => {
      state.currentSongId = id || "entry-1";
      state.currentLibrarySongId = getLibraryIdForSong(state.currentSongId);
      state.selectedTab = "lyrics";
      return state;
    });
    this.openSong();
  },

  togglePlay() {
    updateState((state) => {
      state.isPlaying = !state.isPlaying;
      return state;
    });
    this.setData({ playing: !this.data.playing });
  },
});

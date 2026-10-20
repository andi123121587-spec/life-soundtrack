const { diaryEntries, lyricAlternatives, warningText, loadingTags } = require("../../../data/demo-catalog");
const { loadState, updateState, removeSongFromState } = require("../../../utils/state");
const { formatPrototypeDate, getNavigationMetrics } = require("../../../utils/format");
const cloudService = require("../../../utils/cloud-service");
const audioPlayer = require("../../../utils/audio-player");
const { getLibraryIdForSong } = require("../../../utils/songs");

Page({
  data: {
    dateLabel: formatPrototypeDate(),
    stage: "loading",
    progress: 26,
    draftLine: "AI 正在把这段心情写成旋律｜",
    loadingTags,
    actionMode: "keep",
    warningText,
    alternatives: lyricAlternatives,
    privateWarning: false,
    currentLineIndex: 4,
    navTop: 60,
    errorMessage: "",
    errorTitle: "刚才的创作没有完成",
    isSaving: false,
    isDiscarding: false,
    song: diaryEntries[0],
  },

  onShow() {
    const state = loadState();
    const { navTop } = getNavigationMetrics();
    const privateWarning = Boolean(state.pendingGeneration?.privateMode) || state.pendingGeneration?.mood === "sad";
    const song = (state.generatedSongs || []).find((item) => item.id === state.currentSongId) || diaryEntries[0];
    this.setData({
      stage: state.generationStage || "loading",
      progress: state.progress || 26,
      privateWarning,
      song,
      dateLabel: formatPrototypeDate(),
      navTop,
      draftLine: state.pendingGeneration?.diary ? `正在处理「${state.pendingGeneration.diary.slice(0, 18)}${state.pendingGeneration.diary.length > 18 ? "…" : ""}」` : "AI 正在把这段心情写成旋律｜",
    });
    if (state.generationStage === "result" && state.currentSongId) return this.continueToDetail();
    if (this.data.stage === "loading" && !this.generating) this.generateRealMusic();
  },

  async generateRealMusic() {
    const pending = loadState().pendingGeneration;
    if (!pending?.diary) {
      this.setData({ stage: "error", errorMessage: "没有找到待生成的日记，请返回重新填写" });
      return;
    }
    this.generating = true;
    this.progressTimer = setInterval(() => this.setData({ progress: Math.min(this.data.progress + 3, 92) }), 1000);
    try {
      const result = await cloudService.generateMusic({
        diary: pending.diary,
        mood: pending.mood,
        privateMode: pending.privateMode,
        variant: pending.variant || 0,
        sourceSongId: pending.sourceSongId || "",
      });
      if (this.progressTimer) clearInterval(this.progressTimer);
      if (result.pending) {
        updateState((state) => {
          state.generationStage = "loading";
          state.progress = Math.min(this.data.progress, 92);
          state.pendingGeneration = pending;
          state.generationTaskId = result.taskId || state.generationTaskId;
          return state;
        });
        this.setData({ stage: "loading", progress: Math.min(this.data.progress, 92), draftLine: "任务已转入后台，返回首页后仍会继续生成" });
        wx.showToast({ title: result.message || "云端仍在生成，请稍后查看", icon: "none", duration: 3000 });
        return;
      }
      const song = result.song;
      updateState((state) => {
        state.generatedSongs = [song, ...(state.generatedSongs || []).filter((item) => item.id !== song.id)];
        state.currentSongId = song.id;
        state.currentLibrarySongId = getLibraryIdForSong(song.id);
        state.generationStage = "choice";
        state.progress = 100;
        state.pendingGeneration = pending;
        return state;
      });
      this.setData({ song, progress: 100 });
      if (result.persistenceWarning) wx.showToast({ title: result.persistenceWarning, icon: "none", duration: 4000 });
      this.setData({ stage: "choice" });
    } catch (error) {
      if (this.progressTimer) clearInterval(this.progressTimer);
      updateState((state) => ({ ...state, generationStage: "error" }));
      this.setData({
        stage: "error",
        errorTitle: error.title || "刚才的创作没有完成",
        errorMessage: error.message || "音乐生成失败，请稍后重试",
      });
    } finally {
      this.generating = false;
    }
  },

  onHide() {
    if (this.progressTimer) clearInterval(this.progressTimer);
  },

  onUnload() {
    if (this.progressTimer) clearInterval(this.progressTimer);
  },

  chooseAction(event) {
    this.setData({ actionMode: event.currentTarget.dataset.mode });
  },

  continueToDetail() {
    updateState((state) => {
      const songId = state.currentSongId || "entry-1";
      state.selectedTab = "lyrics";
      state.currentLibrarySongId = getLibraryIdForSong(songId);
      state.showAdjustPanel = false;
      state.showRewritePanel = false;
      state.deletedSongIds = (state.deletedSongIds || []).filter((id) => id !== songId);
      state.generationStage = "idle";
      state.pendingGeneration = null;
      return state;
    });
    wx.redirectTo({ url: "/UI/pages/music/music" });
  },

  openPrivateMode() {
    updateState((state) => ({ ...state, privateMode: true }));
    this.setData({ privateWarning: true });
  },

  changeLine() {
    wx.showToast({ title: "歌曲生成后可修改歌词", icon: "none" });
  },

  async keepSong() {
    if (this.data.isSaving || this.data.isDiscarding) return;
    const state = loadState();
    const songId = state.currentSongId;
    this.setData({ isSaving: true });
    wx.showLoading({ title: "正在保存" });
    try {
      await cloudService.saveGeneratedSong(state.generationTaskId, songId);
      updateState((next) => {
        next.savedSongIds = Array.from(new Set([...(next.savedSongIds || []), songId]));
        next.deletedSongIds = (next.deletedSongIds || []).filter((id) => id !== songId);
        if (this.data.song.private) {
          next.privateSongIds = Array.from(new Set([...(next.privateSongIds || []), songId]));
        }
        next.generationStage = "result";
        next.pendingGeneration = null;
        next.generationTaskId = "";
        next.draftContent = "";
        return next;
      });
      wx.hideLoading();
      wx.showToast({ title: "已保存到歌单", icon: "success" });
      this.continueToDetail();
    } catch (error) {
      wx.hideLoading();
      this.setData({ isSaving: false });
      wx.showToast({ title: error.message || "保存失败，请重试", icon: "none", duration: 3500 });
    }
  },

  discardSong() {
    if (this.data.isSaving || this.data.isDiscarding) return;
    wx.showModal({
      title: "不保存这次生成？",
      content: "这次生成的歌曲、歌词和云端临时音频都会被删除，且无法恢复。你的原始草稿会保留。",
      confirmText: "确认删除",
      confirmColor: "#A65F4B",
      success: async ({ confirm }) => {
        if (!confirm) return;
        const state = loadState();
        const songId = state.currentSongId;
        this.setData({ isDiscarding: true });
        wx.showLoading({ title: "正在删除" });
        try {
          await cloudService.discardGeneratedSong(state.generationTaskId, songId);
          audioPlayer.stop();
          updateState((next) => {
            removeSongFromState(next, songId, { rememberDeleted: false });
            next.generationStage = "idle";
            next.pendingGeneration = null;
            next.generationTaskId = "";
            return next;
          });
          wx.hideLoading();
          wx.redirectTo({ url: "/UI/pages/index/index" });
        } catch (error) {
          wx.hideLoading();
          this.setData({ isDiscarding: false });
          wx.showToast({ title: error.message || "删除失败，请重试", icon: "none", duration: 3500 });
        }
      },
    });
  },

  async retryGeneration() {
    if (this.generating) return;
    const state = loadState();
    const draft = String(state.draftContent || state.pendingGeneration?.diary || "").trim();
    if (!draft) {
      wx.showToast({ title: "草稿为空，请返回修改", icon: "none" });
      return;
    }
    const previousTaskId = state.generationTaskId;
    if (previousTaskId) {
      cloudService.discardGeneratedSong(previousTaskId, "").catch(() => {});
    }
    updateState((next) => {
      next.pendingGeneration = {
        ...(next.pendingGeneration || {}),
        diary: draft,
        mood: next.pendingGeneration?.mood || next.currentMood,
        privateMode: Boolean(next.pendingGeneration?.privateMode ?? next.privateMode),
      };
      next.generationStage = "loading";
      next.progress = 0;
      next.generationTaskId = "";
      return next;
    });
    this.setData({ stage: "loading", progress: 0, errorTitle: "刚才的创作没有完成", errorMessage: "" });
    this.generateRealMusic();
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack({ delta: 1 });
    else wx.redirectTo({ url: "/UI/pages/compose/compose" });
  },

  goHome() {
    wx.navigateTo({ url: "/UI/pages/index/index" });
  },

  openLibrary() {
    wx.navigateTo({ url: "/UI/pages/me/me" });
  },
});

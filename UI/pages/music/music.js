const { diaryEntries, lyricAlternatives } = require("../../../data/demo-catalog");
const { formatTimeRange, getNavigationMetrics } = require("../../../utils/format");
const { loadState, updateState, removeSongFromState, setSongProgress } = require("../../../utils/state");
const audioPlayer = require("../../../utils/audio-player");
const { findSong } = require("../../../utils/songs");
const { refreshAudioUrl, deleteSong: deleteCloudSong, updateSongPrivacy } = require("../../../utils/cloud-service");
const { deleteSongConsistently } = require("../../../Services/database/song-actions");
const { getSongDetail, songDetail: playbackDomain } = require("../../../Features/playback");

const DEFAULT_TRACK_SECONDS = 134;

Page({
  data: {
    dateLabel: "10月10日 · 星期四",
    song: diaryEntries[0],
    diaryParagraphs: [],
    selectedTab: "lyrics",
    currentLineIndex: 4,
    progress: 31,
    currentTime: "0:42",
    totalTime: "2:14",
    isPlaying: false,
    liked: true,
    shuffle: false,
    repeat: false,
    showSongMenu: false,
    showAdjustPanel: false,
    showRewritePanel: false,
    showWarning: false,
    currentAlternative: lyricAlternatives[0],
    lyricAlternatives,
    instruments: ["弦乐", "钢琴", "吉他", "纯人声"],
    currentInstrument: "弦乐",
    previewing: false,
    waveBars: [18, 32, 44, 28, 38, 52, 32, 46, 24, 40, 54, 34, 48, 30],
    tweaks: [
      { key: "emotion", label: "情绪", value: 38, left: "平静", right: "难过" },
      { key: "beat", label: "节奏", value: 24, left: "慢", right: "快" },
      { key: "tone", label: "词风", value: 74, left: "口语", right: "诗意" },
    ],
    playable: false,
    navTop: 60,
    songMenuTop: 112,
    isPrivate: false,
  },

  onLoad() {
    this.unsubscribePlayback = audioPlayer.subscribe(({ isPlaying, progress, currentTime, duration }) => {
      const updates = { isPlaying };
      if (Number.isFinite(progress)) updates.progress = progress;
      if (Number.isFinite(currentTime) && Number.isFinite(duration) && duration > 0) {
        [updates.currentTime, updates.totalTime] = formatTimeRange(Math.round(currentTime), Math.round(duration));
      }
      this.setData(updates);
    });
  },

  async onShow() {
    const state = loadState();
    const { navTop, songMenuTop } = getNavigationMetrics();
    const currentSongId = state.currentSongId || "entry-1";
    let sourceSong = findSong(state, currentSongId);
    sourceSong = await refreshAudioUrl(sourceSong);
    if (sourceSong.cloudFileId && sourceSong.audioSrc) {
      updateState((next) => {
        next.generatedSongs = (next.generatedSongs || []).map((song) => song.id === sourceSong.id ? sourceSong : song);
        return next;
      });
    }
    const detail = getSongDetail(sourceSong, { defaultTweaks: this.data.tweaks });
    const { song, progress } = detail;
    const trackSeconds = song.durationSeconds || DEFAULT_TRACK_SECONDS;
    const [currentTime, totalTime] = formatTimeRange(Math.round(progress / 100 * trackSeconds), trackSeconds);
    this.setData({
      song,
      diaryParagraphs: String(song.diary || "").split(/\n+/).map((item) => item.trim()).filter(Boolean),
      dateLabel: song.date,
      selectedTab: state.selectedTab || "lyrics",
      isPlaying: Boolean(state.isPlaying),
      progress,
      currentTime,
      totalTime,
      liked: detail.liked,
      showSongMenu: false,
      showAdjustPanel: Boolean(state.showAdjustPanel),
      showRewritePanel: Boolean(state.showRewritePanel),
      showWarning: detail.showWarning,
      currentAlternative: lyricAlternatives[0],
      currentLineIndex: Math.max(0, Math.min(4, (song.lyrics || []).length - 1)),
      currentInstrument: state.currentInstrument || "弦乐",
      tweaks: detail.savedTweaks,
      playable: Boolean(song.audioSrc),
      shuffle: Boolean(state.shuffle),
      repeat: Boolean(state.repeat),
      navTop,
      songMenuTop,
      isPrivate: detail.isPrivate,
    });
  },

  onUnload() {
    if (this.unsubscribePlayback) this.unsubscribePlayback();
  },

  selectTab(event) {
    const { tab } = event.currentTarget.dataset;
    this.setData({ selectedTab: tab });
    updateState((state) => {
      state.selectedTab = tab;
      return state;
    });
  },

  selectLyricLine(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({ currentLineIndex: index });
    if (index === 4) this.openRewritePanel();
  },

  togglePlay() {
    const result = audioPlayer.toggle(this.data.song);
    if (!result.ok) wx.showToast({ title: "这首歌暂未接入试听音源", icon: "none" });
  },

  toggleLike() {
    const songId = this.data.song.id;
    const next = updateState((state) => playbackDomain.toggleFavorite(state, songId));
    this.setData({ liked: next.favoriteSongs.includes(songId) });
  },

  toggleSongMenu() {
    this.setData({ showSongMenu: !this.data.showSongMenu });
  },

  seek(event) {
    const progress = Number(event.detail.value);
    if (!this.data.playable) {
      wx.showToast({ title: "接入音源后可拖动进度", icon: "none" });
      return;
    }
    audioPlayer.seek(progress);
    const trackSeconds = this.data.song.durationSeconds || DEFAULT_TRACK_SECONDS;
    const [currentTime, totalTime] = formatTimeRange(Math.round(progress / 100 * trackSeconds), trackSeconds);
    this.setData({ progress, currentTime, totalTime });
    updateState((state) => {
      setSongProgress(state, this.data.song.id, progress);
      return state;
    });
  },

  toggleShuffle() {
    const shuffle = !this.data.shuffle;
    this.setData({ shuffle });
    updateState((state) => ({ ...state, shuffle }));
  },

  toggleRepeat() {
    const repeat = !this.data.repeat;
    this.setData({ repeat });
    updateState((state) => ({ ...state, repeat }));
  },

  previousSong() {
    this.switchSong(-1);
  },

  nextSong() {
    this.switchSong(1);
  },

  switchSong(offset) {
    const state = loadState();
    let nextSong = null;
    updateState((next) => {
      nextSong = playbackDomain.selectAdjacentSong(next, this.data.song.id, offset, this.data.shuffle);
      return next;
    });
    if (!nextSong) return;
    audioPlayer.stop();
    this.onShow();
  },

  openAdjustPanel() {
    this.setData({ showAdjustPanel: true, showSongMenu: false });
    updateState((state) => {
      state.showAdjustPanel = true;
      return state;
    });
  },

  closeAdjustPanel() {
    this.setData({ showAdjustPanel: false, previewing: false });
    updateState((state) => {
      state.showAdjustPanel = false;
      return state;
    });
  },

  changeTweak(event) {
    const { key, value } = event.detail;
    this.setData({ tweaks: this.data.tweaks.map((item) => item.key === key ? { ...item, value } : item) });
  },

  chooseInstrument(event) {
    this.setData({ currentInstrument: event.detail.value });
  },

  togglePreview() {
    if (!this.data.playable) {
      wx.showToast({ title: "接入音源后可试听变化", icon: "none" });
      return;
    }
    this.setData({ previewing: !this.data.previewing });
  },

  applyTweak() {
    const { song, tweaks, currentInstrument } = this.data;
    updateState((state) => playbackDomain.saveSongTweaks(state, song.id, tweaks, currentInstrument));
    wx.showToast({ title: "已应用到这首", icon: "success" });
    this.closeAdjustPanel();
  },

  openRewritePanel() {
    this.setData({ showRewritePanel: true, showSongMenu: false });
    updateState((state) => {
      state.showRewritePanel = true;
      return state;
    });
  },

  regenerateSong() {
    this.setData({ showSongMenu: false });
    wx.showModal({
      title: "再生成一个版本？",
      content: "会保留这首歌，并用同一篇日记生成一个新版本。",
      confirmText: "生成新版",
      confirmColor: "#C98659",
      success: ({ confirm }) => {
        if (!confirm) return;
        const song = this.data.song;
        updateState((state) => playbackDomain.prepareRegeneration(state, song, this.data.isPrivate));
        wx.redirectTo({ url: "/UI/pages/diary/diary" });
      },
    });
  },

  async toggleSongPrivate() {
    const songId = this.data.song.id;
    const isPrivate = !this.data.isPrivate;
    this.setData({ showSongMenu: false });
    wx.showLoading({ title: "正在同步" });
    try {
      await updateSongPrivacy(songId, isPrivate);
      updateState((state) => playbackDomain.setSongPrivacy(state, songId, isPrivate));
      wx.hideLoading();
      this.setData({ isPrivate, song: { ...this.data.song, private: isPrivate } });
      wx.showToast({ title: isPrivate ? "已同步私密标记" : "已取消私密标记", icon: "success" });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || "私密状态同步失败，请重试", icon: "none", duration: 3500 });
    }
  },

  closeRewritePanel() {
    this.setData({ showRewritePanel: false });
    updateState((state) => {
      state.showRewritePanel = false;
      return state;
    });
  },

  chooseAlternative(event) {
    const { text } = event.detail;
    if (text) this.setData({ currentAlternative: text });
  },

  useAlternative() {
    let updatedSong = this.data.song;
    updateState((state) => {
      const result = playbackDomain.replaceLyric(
        state,
        this.data.song,
        this.data.currentLineIndex,
        this.data.currentAlternative,
      );
      updatedSong = result.song;
      return result.state;
    });
    this.setData({ song: updatedSong, showRewritePanel: false, showWarning: false });
    wx.showToast({ title: "已替换这句", icon: "success" });
  },

  lockOriginal() {
    this.setData({ currentAlternative: this.data.song.lyrics[this.data.currentLineIndex] });
    wx.showToast({ title: "已锁定原句", icon: "none" });
  },

  editAlternative() {
    wx.showModal({
      title: "自己改这一句",
      editable: true,
      placeholderText: "写下新的歌词",
      content: this.data.currentAlternative,
      success: ({ confirm, content }) => {
        if (confirm && content && content.trim()) this.setData({ currentAlternative: content.trim() });
      },
    });
  },

  enablePrivateMode() {
    updateState((state) => {
      const songId = this.data.song.id;
      state.privateSongIds = Array.from(new Set([...(state.privateSongIds || []), songId]));
      state.handledWarningSongIds = Array.from(new Set([...(state.handledWarningSongIds || []), songId]));
      return state;
    });
    this.setData({ showWarning: false });
    wx.showToast({ title: "已开启私密模式", icon: "none" });
  },

  deleteSong() {
    this.setData({ showSongMenu: false });
    wx.showModal({
      title: "删除这首歌？",
      content: "删除后将无法恢复。",
      confirmColor: "#A65F4B",
      success: async ({ confirm }) => {
        if (!confirm) return;
        const songId = this.data.song.id;
        wx.showLoading({ title: "正在删除", mask: true });
        try {
          await deleteSongConsistently({
            songId,
            deleteRemote: deleteCloudSong,
            stopPlayback: audioPlayer.stop,
            removeLocal: (id) => updateState((state) => removeSongFromState(state, id)),
          });
          wx.hideLoading();
          wx.redirectTo({ url: "/UI/pages/me/me" });
        } catch (error) {
          wx.hideLoading();
          wx.showToast({
            title: error.message || "删除失败，请稍后重试",
            icon: "none",
            duration: 3500,
          });
        }
      },
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack({ delta: 1 });
    else wx.redirectTo({ url: "/UI/pages/me/me" });
  },
});

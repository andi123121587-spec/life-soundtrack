const { emotionPills, weekMoodBars, topSongs, diaryEntries } = require("../../../data/demo-catalog");
const { loadState, updateState, getGenerationStatus } = require("../../../utils/state");
const audioPlayer = require("../../../utils/audio-player");
const { toLibrarySong, getLibraryIdForSong } = require("../../../utils/songs");
const { refreshAudioUrl, syncGenerationTask } = require("../../../utils/cloud-service");
const { getLibrarySongs } = require("../../../Features/library");

Page({
  data: {
    bars: weekMoodBars,
    filters: emotionPills,
    currentFilter: "all",
    songs: topSongs,
    visibleSongs: topSongs,
    playingSongId: "song-1",
    availableSongs: topSongs,
    generationStatus: { active: false },
    moodLegend: [
      { label: "开心", color: "#7cb2a1" },
      { label: "平静", color: "#f5dfa9" },
      { label: "难过", color: "#95b9eb" },
      { label: "释然", color: "#e8a492" },
      { label: "激动", color: "#9a7b49" },
    ],
  },

  onLoad() {
    this.unsubscribePlayback = audioPlayer.subscribe(({ isPlaying }) => {
      const state = loadState();
      this.setData({ playingSongId: isPlaying ? (state.currentLibrarySongId || getLibraryIdForSong(state.currentSongId)) : "" });
    });
  },

  async onShow() {
    const state = loadState();
    const savedSongIds = state.savedSongIds || [];
    const deletedSongIds = state.deletedSongIds || [];
    const presetSongs = topSongs
      .filter((song) => savedSongIds.includes(song.entryId) && !deletedSongIds.includes(song.entryId))
      .map((song) => {
        const entry = diaryEntries.find((item) => item.id === song.entryId);
        return { ...song, audioSrc: entry?.audioSrc || "", durationSeconds: entry?.durationSeconds || 134 };
      });
    const generatedSongs = await Promise.all((state.generatedSongs || [])
      .filter((song) => savedSongIds.includes(song.id) && !deletedSongIds.includes(song.id))
      .map(refreshAudioUrl));
    if (generatedSongs.length) {
      updateState((next) => ({ ...next, generatedSongs }));
    }
    const availableSongs = getLibrarySongs({ ...state, generatedSongs });
    const currentFilter = state.libraryFilter || "all";
    this.setData({
      currentFilter,
      playingSongId: state.isPlaying ? (state.currentLibrarySongId || getLibraryIdForSong(state.currentSongId)) : "",
      availableSongs,
      visibleSongs: this.applyFilter(currentFilter, availableSongs),
      generationStatus: getGenerationStatus(state),
    });
    this.startGenerationWatcher();
  },

  onHide() {
    this.stopGenerationWatcher();
  },

  onUnload() {
    if (this.unsubscribePlayback) this.unsubscribePlayback();
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

  applyFilter(filter, songs) {
    if (filter === "all") return songs;
    return songs.filter((song) => song.moodKey === filter);
  },

  chooseFilter(event) {
    const { key } = event.currentTarget.dataset;
    this.setData({
      currentFilter: key,
      visibleSongs: this.applyFilter(key, this.data.availableSongs),
    });
    updateState((state) => ({ ...state, libraryFilter: key }));
  },

  playSong(event) {
    const { id } = event.currentTarget.dataset;
    const song = this.data.availableSongs.find((item) => item.id === id);
    if (!song) return;
    const result = audioPlayer.toggle({ ...song, id: song.entryId, libraryId: song.id });
    if (!result.ok) wx.showToast({ title: "这首歌暂未接入试听音源", icon: "none" });
  },

  openSong(event) {
    const { id } = event.currentTarget.dataset;
    const song = this.data.availableSongs.find((item) => item.id === id);
    if (!song) return;
    updateState((state) => {
      state.currentSongId = song.entryId;
      state.currentLibrarySongId = id;
      state.selectedTab = "lyrics";
      return state;
    });
    wx.navigateTo({ url: "/UI/pages/music/music" });
  },

  openCreate() {
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
});

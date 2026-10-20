const { loadState } = require("../../../utils/state");
const { findSong } = require("../../../utils/songs");
const audioPlayer = require("../../../utils/audio-player");

Component({
  properties: {
    current: {
      type: String,
      value: "index",
    },
  },

  data: {
    items: [
      { key: "index", label: "首页", iconSrc: "/assets/icons/home.svg", url: "/UI/pages/index/index" },
      { key: "me", label: "歌单", iconSrc: "/assets/icons/music.svg", url: "/UI/pages/me/me" },
    ],
    isPlaying: false,
  },

  observers: {
    current() {
      this.refresh();
    },
  },

  lifetimes: {
    attached() {
      this.refresh();
      this.unsubscribePlayback = audioPlayer.subscribe(({ isPlaying }) => this.setData({ isPlaying }));
    },
    detached() {
      if (this.unsubscribePlayback) this.unsubscribePlayback();
    },
  },

  methods: {
    refresh() {
      const state = loadState();
      this.setData({ isPlaying: Boolean(state.isPlaying) });
    },

    go(event) {
      const { url } = event.currentTarget.dataset;
      if (!url) return;
      const pages = getCurrentPages();
      const currentRoute = pages[pages.length - 1]?.route || "";
      if (`/${currentRoute}` === url) return;
      wx.redirectTo({ url });
    },

    togglePlay() {
      const state = loadState();
      const song = findSong(state, state.currentSongId || "entry-1");
      const result = audioPlayer.toggle(song);
      if (!result.ok) wx.showToast({ title: "当前歌曲暂未接入试听音源", icon: "none" });
      else this.triggerEvent("playtoggle");
    },

    create() {
      wx.navigateTo({ url: "/UI/pages/compose/compose" });
    },
  },
});

const {
  creationMoods,
  creationPrompts,
} = require("../../../data/demo-catalog");
const { loadState, updateState } = require("../../../utils/state");
const { formatPrototypeDate, getNavigationMetrics } = require("../../../utils/format");
const { startGeneration } = require("../../../Features/compose");

const promptPlaceholders = {
  "一个画面": "写下你此刻脑海里的一个画面：光线、声音、天气，或一个人的表情…",
  "最开心的瞬间": "今天哪一个瞬间让你忍不住开心？当时发生了什么？",
  "每日小记": "从今天最想留下的一件小事开始写…",
  "想对谁说的话": "如果那个人就在面前，你最想对 TA 说什么？",
};

Page({
  data: {
    dateLabel: formatPrototypeDate(),
    moods: creationMoods,
    prompts: creationPrompts,
    currentMood: "sad",
    selectedPrompt: "每日小记",
    privateMode: false,
    content: "",
    canSubmit: false,
    editorFocused: false,
    editorPlaceholder: promptPlaceholders["每日小记"],
    navTop: 60,
  },

  onShow() {
    const state = loadState();
    const { navTop } = getNavigationMetrics();
    this.setData({
      currentMood: state.currentMood || "sad",
      privateMode: Boolean(state.privateMode),
      selectedPrompt: state.selectedPrompt || "每日小记",
      content: state.draftContent || this.data.content,
      canSubmit: Boolean((state.draftContent || this.data.content).trim()),
      dateLabel: formatPrototypeDate(),
      editorPlaceholder: promptPlaceholders[state.selectedPrompt] || promptPlaceholders["每日小记"],
      navTop,
    });
  },

  chooseMood(event) {
    const { key } = event.currentTarget.dataset;
    updateState((state) => {
      state.currentMood = key;
      return state;
    });
    this.setData({ currentMood: key });
  },

  choosePrompt(event) {
    const { prompt } = event.currentTarget.dataset;
    updateState((state) => {
      state.selectedPrompt = prompt;
      return state;
    });
    this.setData({
      selectedPrompt: prompt,
      editorPlaceholder: promptPlaceholders[prompt] || promptPlaceholders["每日小记"],
      editorFocused: true,
    });
  },

  togglePrivate() {
    updateState((state) => {
      state.privateMode = !state.privateMode;
      return state;
    });
    this.setData({ privateMode: !this.data.privateMode });
  },

  updateContent(event) {
    const content = event.detail.value;
    this.setData({ content, canSubmit: Boolean(content.trim()) });
    updateState((state) => {
      state.draftContent = content;
      return state;
    });
  },

  startCreate() {
    const draft = (this.data.content || loadState().draftContent || "").trim();
    if (!draft) {
      wx.showToast({ title: "先写下一点此刻的心情", icon: "none" });
      return;
    }
    startGeneration({ diary: draft, mood: this.data.currentMood, privateMode: this.data.privateMode, variant: 0 });
    wx.navigateTo({ url: "/UI/pages/diary/diary" });
  },

  showDataNotice() {
    wx.showModal({
      title: "生成与数据说明",
      content: "提交后，日记文字会发送给 MiniMax 音乐生成服务。生成期间，原文、情绪、私密标记、歌词和临时音频会保存在云端任务中；只有确认保存后，日记、歌词和音频才会进入云端歌单。云端内容按当前微信账号读取；私密标记会同步到云端。选择“不保存这次”或在歌曲详情中删除，可删除本应用中的对应任务、记录和云端音频。第三方服务如何处理请求数据以其规则为准，本应用不作“不会用于训练”的承诺。",
      showCancel: false,
      confirmText: "我知道了",
      confirmColor: "#C98659",
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack({ delta: 1 });
    else wx.redirectTo({ url: "/UI/pages/index/index" });
  },

  showMenu() {
    wx.showActionSheet({
      itemList: ["清空内容", "保存草稿"],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) {
          this.setData({ content: "", canSubmit: false });
          updateState((state) => {
            state.draftContent = "";
            return state;
          });
        } else {
          wx.showToast({ title: "草稿已保存", icon: "success" });
        }
      },
    });
  },
});

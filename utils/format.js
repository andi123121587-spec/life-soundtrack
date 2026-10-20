function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatPrototypeDate(date = new Date()) {
  const d = new Date(date);
  const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${days[d.getDay()]}`;
}

function getGreeting(hour = new Date().getHours()) {
  if (hour < 6) return "凌晨好";
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function formatTimeRange(current = 42, total = 214) {
  const currentMinutes = Math.floor(current / 60);
  const currentSeconds = pad(current % 60);
  const totalMinutes = Math.floor(total / 60);
  const totalSeconds = pad(total % 60);
  return [`${currentMinutes}:${currentSeconds}`, `${totalMinutes}:${totalSeconds}`];
}

function getNavigationMetrics() {
  try {
    const menu = wx.getMenuButtonBoundingClientRect();
    if (menu && menu.bottom) {
      return {
        navTop: menu.bottom + 8,
        songMenuTop: menu.bottom + 56,
      };
    }
  } catch (error) {
    // Use a stable fallback in environments without a menu button API.
  }
  return { navTop: 60, songMenuTop: 112 };
}

module.exports = {
  formatPrototypeDate,
  getGreeting,
  formatTimeRange,
  getNavigationMetrics,
};

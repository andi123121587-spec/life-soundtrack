Component({
  properties: {
    moods: {
      type: Array,
      value: [],
    },
    value: {
      type: String,
      value: "",
    },
    compact: {
      type: Boolean,
      value: false,
    },
    dark: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    chooseMood(event) {
      const mood = event.currentTarget.dataset.mood;
      if (!mood) return;
      this.triggerEvent("change", { mood });
    },
  },
});

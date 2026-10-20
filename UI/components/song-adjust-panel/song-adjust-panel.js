Component({
  properties: {
    visible: Boolean,
    tweaks: Array,
    instruments: Array,
    currentInstrument: String,
    previewing: Boolean,
    playable: Boolean,
    waveBars: Array,
  },
  methods: {
    close() { this.triggerEvent("close"); },
    change(event) { this.triggerEvent("change", { key: event.currentTarget.dataset.key, value: Number(event.detail.value) }); },
    choose(event) { this.triggerEvent("choose", { value: event.currentTarget.dataset.value }); },
    preview() { this.triggerEvent("preview"); },
    apply() { this.triggerEvent("apply"); },
  },
});

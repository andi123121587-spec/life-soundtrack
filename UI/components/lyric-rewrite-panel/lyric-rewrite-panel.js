Component({
  properties: {
    visible: Boolean,
    original: String,
    alternatives: Array,
    currentAlternative: String,
  },
  methods: {
    close() { this.triggerEvent("close"); },
    choose(event) { this.triggerEvent("choose", { text: event.currentTarget.dataset.text }); },
    lock() { this.triggerEvent("lock"); },
    edit() { this.triggerEvent("edit"); },
    apply() { this.triggerEvent("apply"); },
  },
});

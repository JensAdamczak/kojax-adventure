// One deliberate step at a time. Adjacent objects take two deliberate presses, without a timing deadline.
export class MovementInput {
  constructor({ read, execute, now = () => performance.now() }) {
    Object.assign(this, { read, execute, now });
    this.clear();
  }
  clear() {
    this.queued = null;
    this.objectPress = null;
  }
  direction(dir, kind = "walk") {
    const state = this.read();
    if (state.blocked) {
      this.clear();
      return;
    }
    if (state.busy) {
      if (state.canQueue && !this.queued) this.queued = { dir, kind };
      return;
    }
    const object = kind === "walk" ? state.objectKey(dir) : null;
    if (object) {
      const previous = this.objectPress;
      if (previous?.object === object && previous.dir === dir) {
        this.objectPress = null;
        return this.execute(dir, "push");
      }
      const result = this.execute(dir, "walk");
      this.objectPress = { object, dir, time: this.now() };
      return result;
    }
    this.objectPress = null;
    return this.execute(dir, kind);
  }
  drain() {
    const next = this.queued;
    this.queued = null;
    if (next) this.direction(next.dir, next.kind);
  }
}

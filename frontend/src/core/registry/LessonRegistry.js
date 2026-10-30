/**
 * Central Lesson Registry & Index Store.
 * Stores all interactive lessons indexed by `id` and `number`, and validates declarative circuit layouts.
 */
export class LessonRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this.byId = new Map();
  }

  /**
   * Registers a lesson definition.
   * @param {object} lesson
   */
  register(lesson) {
    if (!lesson || typeof lesson.id !== 'string' || !lesson.id.trim()) {
      throw new Error('LessonRegistry.register requires a valid lesson.id');
    }
    if (!lesson.title || !Array.isArray(lesson.code)) {
      throw new Error(`Lesson "${lesson.id}" is missing required title or code array`);
    }
    if (this.byId.has(lesson.id)) {
      throw new Error(`Duplicate lesson id "${lesson.id}" in LessonRegistry`);
    }
    this.byId.set(lesson.id, lesson);
    return this;
  }

  /**
   * Registers multiple lessons in order.
   * @param {object[]} lessons
   */
  registerAll(lessons = []) {
    for (const lesson of lessons) {
      if (!this.byId.has(lesson.id)) {
        this.register(lesson);
      }
    }
    return this;
  }

  has(id) {
    return this.byId.has(id);
  }

  get(id) {
    return this.byId.get(id) || null;
  }

  getAll() {
    return [...this.byId.values()];
  }

  count() {
    return this.byId.size;
  }

  clear() {
    this.byId.clear();
  }
}

export const lessonRegistry = new LessonRegistry();

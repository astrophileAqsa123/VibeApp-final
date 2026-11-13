const { components } = require("./definitions/builtin");

class ComponentRegistry {
  constructor(initial = components) {
    this.byId = new Map();
    for (const descriptor of initial) this.register(descriptor);
  }

  register(descriptor) {
    if (!descriptor?.id || !Number.isInteger(descriptor.version)) {
      throw new Error("Component descriptors require id and integer version.");
    }
    if (this.byId.has(descriptor.id)) throw new Error(`Component already registered: ${descriptor.id}`);
    this.byId.set(descriptor.id, Object.freeze({ ...descriptor, dependencies: [...(descriptor.dependencies || [])], tags: [...(descriptor.tags || [])], produces: [...(descriptor.produces || [])] }));
    return this;
  }

  get(id) {
    return this.byId.get(id) || null;
  }

  require(id) {
    const component = this.get(id);
    if (!component) throw new Error(`Unknown component: ${id}`);
    return component;
  }

  list() {
    return [...this.byId.values()];
  }

  findByTags(tags = []) {
    const wanted = new Set(tags);
    return this.list().filter((component) => component.tags.some((tag) => wanted.has(tag)));
  }

  compactManifest(tags = []) {
    const source = tags.length ? this.findByTags(tags) : this.list();
    return source.map(({ id, version, description, dependencies, produces }) => ({ id, version, description, dependencies, produces }));
  }
}

module.exports = { ComponentRegistry };

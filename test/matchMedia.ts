/** Minimal spec-compliant `matchMedia` stub driven by a virtual viewport. */
export function createFakeWindow(initialWidth = 1024, initialHeight = 768) {
  const lists = new Set<Fake>();
  let width = initialWidth;
  let height = initialHeight;
  const winListeners = new Map<string, Set<EventListener>>();

  class Fake {
    matches = false;
    readonly listeners = new Set<(e: MediaQueryListEvent) => void>();
    constructor(public media: string) {
      this.matches = evaluate(media);
    }
    addEventListener(_t: string, cb: (e: MediaQueryListEvent) => void) {
      this.listeners.add(cb);
    }
    removeEventListener(_t: string, cb: (e: MediaQueryListEvent) => void) {
      this.listeners.delete(cb);
    }
  }

  function evaluate(query: string): boolean {
    return query.split(' and ').every((part) => {
      const min = /\(min-width:\s*([\d.]+)px\)/.exec(part);
      if (min) return width >= Number(min[1]);
      const max = /\(max-width:\s*([\d.]+)px\)/.exec(part);
      if (max) return width <= Number(max[1]);
      const orientation = /\(orientation:\s*(\w+)\)/.exec(part);
      if (orientation)
        return orientation[1] === (width >= height ? 'landscape' : 'portrait');
      return false;
    });
  }

  const win = {
    get innerWidth() {
      return width;
    },
    get innerHeight() {
      return height;
    },
    document: { documentElement: fakeElement() },
    matchMedia(query: string) {
      const list = new Fake(query);
      lists.add(list);
      return list as unknown as MediaQueryList;
    },
    addEventListener(type: string, cb: EventListener) {
      (winListeners.get(type) ?? winListeners.set(type, new Set()).get(type)!).add(cb);
    },
    removeEventListener(type: string, cb: EventListener) {
      winListeners.get(type)?.delete(cb);
    },
    requestAnimationFrame(cb: FrameRequestCallback) {
      cb(0);
      return 1;
    },
    cancelAnimationFrame() {},
  } as unknown as Window;

  function resize(nextWidth: number, nextHeight = height) {
    width = nextWidth;
    height = nextHeight;
    // Spec behaviour: every MediaQueryList is re-evaluated before any
    // `change` event is dispatched, so listeners never observe a half-updated
    // set of queries.
    const changed: Fake[] = [];
    for (const list of lists) {
      const next = evaluate(list.media);
      if (next !== list.matches) {
        list.matches = next;
        changed.push(list);
      }
    }
    for (const list of changed) {
      for (const cb of list.listeners) {
        cb({ matches: list.matches, media: list.media } as MediaQueryListEvent);
      }
    }
    for (const cb of winListeners.get('resize') ?? []) cb(new Event('resize'));
  }

  return { window: win, resize };
}

function fakeElement() {
  const attrs = new Map<string, string>();
  return {
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    getAttribute: (k: string) => attrs.get(k) ?? null,
  } as unknown as Element;
}

import {xmap} from "./xmap.mjs";

export class AsyncLock {
    private static readonly map = xmap(new WeakMap<WeakKey, Promise<unknown>>());

    public static acquire<T>(key: WeakKey, factory: (release: () => void) => Promise<T>): Promise<T> {
        return this.map.ensure(key, () =>
            factory(() => this.release(key)).finally(() => this.release(key)),
        ) as Promise<T>;
    }

    public static has(key: WeakKey) {
        return this.map.has(key);
    }

    private static release(key: WeakKey): void {
        this.map.delete(key);
    }
}

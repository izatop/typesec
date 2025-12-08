import {assert, fn, object, type Rec} from "@typesec/the";
import {Contract} from "./class/Contract.mts";
import type {Domain} from "./interfaces.mts";

const registry = new Map();

export function domain<N extends string, T extends Rec<string, unknown>>(name: N, schema: T): Domain<N, T> {
    assert(!registry.has(name), `Domain ${name} is already exists`);
    registry.set(name, true);

    return {name, root: normalize(schema, [name])};
}

function normalize<T extends Rec<string, unknown>>(schema: T, paths: string[]): T {
    const root: Rec = {};
    for (const [key, value] of object.toEntries(schema)) {
        root[key] = invariant(key, value, paths.join("."));
    }

    return root;
}

function invariant<K, V>(key: K, value: V, paths: string) {
    assert(fn.is(key, "string"), `Wrong domain leaf ${paths}: ${key}`);
    if (value instanceof Contract) {
        return value;
    }

    assert(object.isPlain(value), `Wrong domain leaf ${paths}.${key} value: ${value}`);

    return normalize(value, [paths]);
}

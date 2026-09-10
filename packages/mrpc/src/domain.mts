import {assert} from "@typesec/the/assert";
import {fn} from "@typesec/the/fn";
import {object} from "@typesec/the/object";
import type {Rec} from "@typesec/the/type";
import {Contract} from "./class/Contract.mjs";
import type {Domain} from "./interfaces.mjs";

const registry = new Map();

/**
 * Names a tree of contracts, checking that every leaf is one and that the name is not already taken.
 *
 * The same domain is given to `backend` on the server and to `client` on the caller, which is what keeps the two ends in step.
 * @category rpc
 * @example domain("TestDomain", {strings: {count: StringCountContract}})
 */
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

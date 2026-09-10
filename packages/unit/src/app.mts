import type {Rec} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import {is, isNullish} from "@typesec/the/fn";
import {resolveSync} from "bun";
import type Module from "node:module";
import path from "node:path";
import type {Application, HandleEntry, Proto} from "./interfaces.mjs";
import type {ProtoAbstract} from "./ProtoAbstract.mjs";
import {tracer} from "./tracer.mjs";

/**
 * Imports an application entrypoint and runs its protocol against the `app` directory beside it.
 * @category protocol
 */
export async function runApplication(location: string): Promise<void> {
    tracer.log("runApplication( <%s> )", location);

    const realPath = resolveSync(location, process.cwd());
    const {proto} = getApplication(await import(realPath));
    await proto.run({path: path.resolve(path.dirname(realPath), "app")});
}

/**
 * Reads the application from a module's default export, asserting it is one.
 * @category protocol
 */
export function getApplication<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    module: Rec,
): Application<TContext, TProto, TIn, TRet> {
    assert("default" in module, "Wrong an Application default export");
    assert(isApplication<TContext, TProto, TIn, TRet>(module["default"]), "Wrong an Application Entrypoint");

    return module["default"];
}

/**
 * Whether a value is an application factory.
 * @category guard
 */
export function isApplication<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    value: unknown,
): value is Application<TContext, TProto, TIn, TRet> {
    return is(value, "function") && "proto" in value;
}

/**
 * Reads an entrypoint handle from a routed module, asserting it belongs to the expected protocol.
 * @category protocol
 */
export function getHandle<TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    proto: Proto<TProto, TIn, TRet>,
    module: Module,
): HandleEntry<TProto, TIn, TRet> {
    assert("default" in module, "Unknown default export");
    assert(isHandleEntry<TProto, TIn, TRet>(module.default), "Wrong default export type");
    assert(isProtoOf(proto, module.default.proto), "Wrong default export proto");

    return module.default;
}

/**
 * Whether a value is an entrypoint handle.
 * @category guard
 */
export function isHandleEntry<TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    value: unknown,
): value is HandleEntry<TProto, TIn, TRet> {
    return is(value, "function") && "proto" in value && "meta" in value;
}

/**
 * Whether an entrypoint's proto is the one the running protocol expects, or derived from it.
 *
 * A protocol may subclass itself — `ServeProto.configure(...)` returns one — so the check walks the
 * static prototype chain instead of comparing the two classes directly.
 */
function isProtoOf<TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    proto: Proto<TProto, TIn, TRet>,
    input: unknown,
): boolean {
    let next = input;

    while (!isNullish(next)) {
        if (next === proto) {
            return true;
        }

        next = Object.getPrototypeOf(next);
    }

    return false;
}

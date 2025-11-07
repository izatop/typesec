import {type Rec} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import {is} from "@typesec/the/fn";
import {resolveSync} from "bun";
import type Module from "node:module";
import path from "node:path";
import type {Application, HandleEntry, Proto} from "./interfaces.mjs";
import type {ProtoAbstract} from "./ProtoAbstract.mjs";
import {tracer} from "./tracer.mts";

export async function runApplication(location: string): Promise<void> {
    tracer.log("runApplication( <%s> )", location);

    const realPath = resolveSync(location, process.cwd());
    const {proto} = getApplication(await import(realPath));
    await proto.run({path: path.resolve(path.dirname(realPath), "app")});
}

export function getApplication<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    module: Rec,
): Application<TContext, TProto, TIn, TRet> {
    assert("default" in module, "Wrong an Application default export");
    assert(isApplication<TContext, TProto, TIn, TRet>(module["default"]), "Wrong an Application Entrypoint");

    return module["default"];
}

export function isApplication<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    value: unknown,
): value is Application<TContext, TProto, TIn, TRet> {
    return is(value, "function") && "proto" in value;
}

export function getHandle<TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    proto: Proto<TProto, TIn, TRet>,
    module: Module,
): HandleEntry<TProto, TIn, TRet> {
    assert("default" in module, "Unknown default export");
    assert(isHandleEntry<TProto, TIn, TRet>(module.default), "Wrong default export type");
    assert(module.default.proto === proto, "Wrong default export proto");

    return module.default;
}

export function isHandleEntry<TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    value: unknown,
): value is HandleEntry<TProto, TIn, TRet> {
    return is(value, "function") && "proto" in value && "meta" in value;
}

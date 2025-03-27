import {isFunction, type Rec} from "@typesec/the";
import {log} from "@typesec/tracer";
import {resolveSync} from "bun";
import {ok} from "node:assert";
import type Module from "node:module";
import path from "node:path";
import type {Application, HandleEntry, Proto} from "./interfaces.mjs";
import type {ProtoAbstract} from "./ProtoAbstract.mjs";

export async function runApplication(location: string) {
    log("try( location: %s )", location);

    const realPath = resolveSync(location, process.cwd());
    const app = getApplication(await import(realPath));
    await app.proto.run({path: path.resolve(path.dirname(realPath), "app")});
}

export function getApplication<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    module: Rec,
): Application<TContext, TProto, TIn, TRet> {
    ok("default" in module, "Wrong an Application default export");
    ok(isApplication<TContext, TProto, TIn, TRet>(module["default"]), "Wrong an Application Entrypoint");

    return module["default"];
}

export function isApplication<TContext, TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    value: unknown,
): value is Application<TContext, TProto, TIn, TRet> {
    return isFunction(value) && "proto" in value;
}

export function getHandle<TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    proto: Proto<TProto, TIn, TRet>,
    module: Module,
): HandleEntry<TProto, TIn, TRet> {
    ok("default" in module, "Unknown default export");
    ok(isHandleEntry<TProto, TIn, TRet>(module.default), "Wrong default export type");
    ok(module.default.proto === proto, "Wrong default export proto");

    return module.default;
}

export function isHandleEntry<TProto extends ProtoAbstract<TIn>, TIn, TRet>(
    value: unknown,
): value is HandleEntry<TProto, TIn, TRet> {
    return isFunction(value) && "proto" in value && "meta" in value;
}

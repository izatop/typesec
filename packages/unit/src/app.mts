import {isFunction, type Rec} from "@typesec/the";
import {ok} from "node:assert";
import type Module from "node:module";
import type {Application, HandleEntry, IProto, Proto} from "./interfaces.mjs";

export function getApplication<TContext, TProto extends IProto<TIn>, TIn, TRet>(
    module: Rec,
): Application<TContext, TProto, TIn, TRet> {
    ok("default" in module, "Wrong an Application default export");
    ok(isApplication<TContext, TProto, TIn, TRet>(module["default"]), "Wrong an Application Entrypoint");

    return module["default"];
}

export function isApplication<TContext, TProto extends IProto<TIn>, TIn, TRet>(
    value: unknown,
): value is Application<TContext, TProto, TIn, TRet> {
    return isFunction(value) && "proto" in value;
}

export function getHandle<TProto extends IProto<TIn>, TIn, TRet>(
    proto: Proto<TProto, TIn, TRet>,
    module: Module,
): HandleEntry<TIn, TRet> {
    ok("default" in module, "Unknown default export");
    ok(isHandleEntry<TIn, TRet>(module.default), "Wrong default export type");
    ok(module.default.proto === proto, "Wrong default export proto");

    return module.default;
}

export function isHandleEntry<TIn, TRet>(value: unknown): value is HandleEntry<TIn, TRet> {
    return isFunction(value) && "proto" in value && "meta" in value;
}

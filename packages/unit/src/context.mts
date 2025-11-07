import {dispose, locator, resolve, runtime, service} from "@typesec/core";
import {ContextResolver} from "./ContextResolver.mjs";
import type {Application, Factory, SetupOptions} from "./interfaces.mjs";
import type {ProtoAbstract} from "./ProtoAbstract.mjs";
import {tracer} from "./tracer.mts";

export function context<TProto extends ProtoAbstract<TIn>, TIn, TRet, TContext>(
    args: SetupOptions<TContext, TProto, TIn, TRet>,
): Application<TContext, TProto, TIn, TRet> {
    const {proto, context = null, ...meta} = args;
    class ThisContextResolver extends ContextResolver<TContext> {}
    const factory: Factory<TContext, TProto, TIn, TRet> = ({handle, only, ...handleMeta}) => {
        return Object.assign(
            async function run(request: TIn) {
                runtime.only(only);

                const {context} = await resolve(ThisContextResolver);
                const instance = new proto(request);
                tracer.log("call( <%s>, <%o> )", handleMeta.name, request);

                const response = await locator(function locateService() {
                    return handle.call(instance, {proto: instance, request, context});
                });

                proto.validate(response);

                await dispose(response);
                await dispose(instance);

                return response;
            },
            {meta: handleMeta, proto},
        );
    };

    service(ThisContextResolver, ThisContextResolver.from(context));

    return Object.assign(factory, {meta, proto, context}) as Application<TContext, TProto, TIn, TRet>;
}

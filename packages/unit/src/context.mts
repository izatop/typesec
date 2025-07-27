import {dispose, locator, resolve, runtime, service} from "@typesec/core";
import {log} from "@typesec/tracer";
import {ContextResolver} from "./ContextResolver.mjs";
import type {Application, Factory, SetupOptions} from "./interfaces.mjs";
import type {ProtoAbstract} from "./ProtoAbstract.mjs";

export function context<TProto extends ProtoAbstract<TIn>, TIn, TRet, TContext>(
    args: SetupOptions<TContext, TProto, TIn, TRet>,
): Application<TContext, TProto, TIn, TRet> {
    const {proto, context = null, ...meta} = args;
    class ThisContextResolver extends ContextResolver<TContext> {}
    const factory: Factory<TContext, TProto, TIn, TRet> = (args) => {
        return Object.assign(
            async function run(request: TIn) {
                runtime.only(meta.only);

                const {context} = await resolve(ThisContextResolver);

                try {
                    const instance = new proto(request);
                    log("%s ( %s ): *resource", args.name, request);

                    const response = await locator(function locateService() {
                        return args.handle.call(instance, {proto: instance, request, context});
                    });

                    proto.validate(response);

                    await dispose(response);
                    await dispose(instance);

                    return response;
                } catch (reason) {
                    log("catch( <%s> *resource ): %s", args.name, reason);

                    throw reason;
                }
            },
            {meta, proto},
        );
    };

    service(ThisContextResolver, ThisContextResolver.from(context));

    return Object.assign(factory, {meta, proto, context}) as Application<TContext, TProto, TIn, TRet>;
}

import {dispose, runtime} from "@typesec/core";
import {wrap} from "@typesec/tracer";
import {getHandle, ProtoAbstract, type MainArgs} from "@typesec/unit";
import {FileSystemRouter, type BunRequest, type MatchedRoute, type Serve, type Server} from "bun";
import path from "node:path";
import {ServeError} from "./ServeError.mjs";

export type ServeInput = {
    request: BunRequest;
    route: MatchedRoute;
};

export type ServeProtoConfig = {
    lookup: string[];
    routes?: Serve.Routes<unknown, string>;
};

export class ServeProto extends ProtoAbstract<ServeInput> {
    public static config: ServeProtoConfig = {lookup: ["/*"]};

    public static readonly instances: Server<undefined>[] = [];

    public static validate(value: unknown): value is Response {
        return value instanceof Response;
    }

    public static createRouter(args: MainArgs): FileSystemRouter {
        return new FileSystemRouter({
            dir: path.resolve(args.path),
            style: "nextjs",
            fileExtensions: [".mts", ".mjs"],
        });
    }

    public static configure(config: ServeProtoConfig): typeof ServeProto {
        return class ServeProtoConfigured extends this {
            public static override config = config;
        };
    }

    public static async run(args: MainArgs): Promise<void> {
        const trace = wrap(this);

        await runtime.run(async () => {
            trace.info("run(%o)", args);

            const router = this.createRouter(args);
            const routes: Serve.Routes<unknown, string> = this.config.routes ?? {};
            const resolver = async (request: BunRequest) => {
                try {
                    const route = router.match(request);
                    trace.log("[ServeProto] fetch(%s): %s", request.url, route?.src ?? null);
                    if (route) {
                        const handle = getHandle(ServeProto, await import(route.filePath));

                        return await handle({request, route});
                    }
                } catch (reason) {
                    trace.error(reason);
                    if (reason instanceof ServeError) {
                        trace.warn("[ServeProto] Server error", reason);

                        return new Response(reason.message, {status: reason.code});
                    }

                    if (reason instanceof Error) {
                        trace.warn("[ServeProto] Server error", reason);

                        return new Response(reason.message, {status: 500});
                    }

                    return new Response("Internal Server Error", {status: 500});
                }

                return new Response("Not found", {status: 404});
            };

            for (const path of this.config.lookup) {
                routes[path] = resolver;
            }

            const server = Bun.serve({
                routes,
                port: 3000,
                development: runtime.isDevelopment()
                    ? {
                          hmr: true,
                      }
                    : false,
            });

            this.instances.push(server);

            const res = await args.ready?.();
            await runtime.heartbeat(() => dispose(res));

            return {
                [Symbol.asyncDispose]: async () => {
                    this.instances.splice(this.instances.indexOf(server), 1);
                    await server.stop();
                },
            };
        });
    }
}

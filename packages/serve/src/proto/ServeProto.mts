import {dispose, runtime} from "@typesec/core";
import {wrap} from "@typesec/tracer";
import {getHandle, ProtoAbstract, type MainArgs} from "@typesec/unit";
import {FileSystemRouter, type BunRequest, type MatchedRoute, type Serve, type Server} from "bun";
import {hostname} from "node:os";
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

    public static configure(config: Partial<ServeProtoConfig>): typeof ServeProto {
        return class ServeProtoConfigured extends this {
            public static override config = {...ServeProto.config, ...config};
        };
    }

    public static async run(args: MainArgs): Promise<void> {
        const trace = wrap(this);

        const serverId = hostname();
        const xServiceId = "x-service-id";
        const staticHeaders: Record<string, string> = false === runtime.isProduction() ? {[xServiceId]: serverId} : {};

        await runtime.run(async () => {
            trace.info("run(%o)", args);

            const router = this.createRouter(args);
            const routes: Serve.Routes<unknown, string> = this.config.routes ?? {};
            const matcher = async (request: BunRequest) => {
                try {
                    const route = router.match(request);
                    trace.log("[ServeProto] fetch(%s): %s", request.url, route?.src ?? null);
                    if (route) {
                        const handle = getHandle(ServeProto, await import(route.filePath));

                        const response = await handle({request, route});
                        if (false === runtime.isProduction()) {
                            response.headers.append(xServiceId, serverId);
                        }

                        return response;
                    }
                } catch (reason) {
                    trace.error(reason);
                    if (reason instanceof ServeError) {
                        trace.warn("[ServeProto] Server error", reason);

                        return new Response(reason.message, {status: reason.code, headers: staticHeaders});
                    }

                    if (reason instanceof Error) {
                        trace.warn("[ServeProto] Server error", reason);

                        return new Response(reason.message, {status: 500, headers: staticHeaders});
                    }

                    return new Response("Internal Server Error", {status: 500, headers: staticHeaders});
                }

                return new Response("Not found", {status: 404, headers: staticHeaders});
            };

            for (const path of this.config.lookup) {
                routes[path] = matcher;
            }

            const server = Bun.serve({
                routes,
                port: 3000,
                development: runtime.isDevelopment() ? {hmr: runtime.hmr} : false,
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

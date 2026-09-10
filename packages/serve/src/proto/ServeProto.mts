import {dispose, runtime} from "@typesec/core";
import {wrap} from "@typesec/tracer";
import {getHandle, ProtoAbstract, type MainArgs} from "@typesec/unit";
import {FileSystemRouter, type BunRequest, type MatchedRoute, type Serve, type Server} from "bun";
import {hostname} from "node:os";
import path from "node:path";
import {ServeError} from "./ServeError.mjs";

/**
 * What an HTTP entrypoint receives: the request and the route that matched.
 * @category http
 */
export type ServeInput = {
    request: BunRequest;
    route: MatchedRoute;
};

/**
 * Server configuration: which paths to route, extra Bun routes, CORS and the port.
 * @category http
 */
export type ServeProtoConfig = {
    lookup: string[];
    routes?: Serve.Routes<unknown, string>;
    cors?: "auto-allow-any";
    port?: number;
};

/**
 * The HTTP protocol: a Bun server with file-system routing.
 *
 * Files under the application's `app` directory become routes in Next.js style, so `user/[id].mts` answers `/user/42`. A handler returns a `Response`; a thrown `ServeError` becomes its status, anything else a 500.
 * @category http
 * @category protocol
 */
export class ServeProto extends ProtoAbstract<ServeInput> {
    /** Configuration this protocol class serves with. */
    public static config: ServeProtoConfig = {lookup: ["/*"]};

    /** Servers currently running under this protocol, for tests and shutdown. */
    public static readonly instances: Server<undefined>[] = [];

    /** An HTTP handler must return a `Response`. */
    public static validate(value: unknown): value is Response {
        return value instanceof Response;
    }

    /** Builds the file-system router over the application's `app` directory. */
    public static createRouter(args: MainArgs): FileSystemRouter {
        return new FileSystemRouter({
            dir: path.resolve(args.path),
            style: "nextjs",
            fileExtensions: [".mts", ".mjs"],
        });
    }

    /**
     * A subclass carrying the given configuration, so one application can serve on its own port and paths.
     * @example ServeProto.configure({port: 8080, cors: "auto-allow-any"})
     */
    public static configure(config: Partial<ServeProtoConfig>): typeof ServeProto {
        return class ServeProtoConfigured extends this {
            public static override config = {...ServeProto.config, ...config};
        };
    }

    /** Starts the server and keeps it up until the runtime aborts. */
    public static async run(args: MainArgs): Promise<void> {
        const trace = wrap(this);

        const serverId = hostname();
        const xServiceId = "x-service-id";
        const staticHeaders: Record<string, string> = runtime.isNotProduction() ? {[xServiceId]: serverId} : {};

        await runtime.run(async () => {
            trace.info("run(%o)", args);

            const preload = this.preload(args);
            const router = this.createRouter(args);
            const routes: Serve.Routes<unknown, string> = this.config.routes ?? {};

            if (this.config.cors === "auto-allow-any") {
                staticHeaders["Access-Control-Allow-Origin"] = "*";
                routes["/**"] = {
                    OPTIONS: (ctx) => {
                        return new Response(null, {
                            status: 200,
                            headers: {
                                "Access-Control-Allow-Origin": "*",
                                "Access-Control-Allow-Methods": ctx.headers.get("access-control-request-method") ?? "",
                                "Access-Control-Allow-Headers": ctx.headers.get("access-control-request-headers") ?? "",
                            },
                        });
                    },
                };
            }

            const matcher = async (request: BunRequest) => {
                try {
                    const route = router.match(request);
                    trace.log("[ServeProto] fetch(%s): %s", request.url, route?.src ?? null);
                    if (route) {
                        const handle = getHandle(ServeProto, await import(route.filePath));

                        const response = await handle({request, route});
                        for (const [key, value] of Object.entries(staticHeaders)) {
                            response.headers.append(key, value);
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
                port: this.config.port ?? 3000,
                development: runtime.isDevelopment() ? {hmr: runtime.hmr} : false,
            });

            this.instances.push(server);

            const res = await args.ready?.();

            await preload;
            await runtime.heartbeat(() => dispose(res));

            return {
                [Symbol.asyncDispose]: async () => {
                    this.instances.splice(this.instances.indexOf(server), 1);
                    await server.stop();
                },
            };
        });
    }

    private static async preload(args: MainArgs): Promise<void> {
        const dir = path.resolve(args.path);
        const glob = new Bun.Glob("*.{mts,mjs}");
        const preloading = [];
        for await (const file of glob.scan(dir)) {
            preloading.push(import(path.resolve(dir, file)));
        }

        await Promise.all(preloading);
    }
}

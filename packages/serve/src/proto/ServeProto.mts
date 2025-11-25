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

export class ServeProto extends ProtoAbstract<ServeInput> {
    public static routes: Serve.Routes<unknown, string> = {};

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

    public static withStaticRoutes(routes: Serve.Routes<unknown, string>): typeof ServeProto {
        return class ServeProtoWithStaticRoutes extends this {
            public static override routes = routes;
        };
    }

    public static async run(args: MainArgs): Promise<void> {
        const trace = wrap(this);

        await runtime.run(async () => {
            trace.info("run(%o)", args);

            const router = this.createRouter(args);
            const server = Bun.serve({
                port: 3000,
                development: runtime.isDevelopment()
                    ? {
                          hmr: true,
                      }
                    : false,
                routes: {
                    ...this.routes,
                    "/*": async (request) => {
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
                    },
                },
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

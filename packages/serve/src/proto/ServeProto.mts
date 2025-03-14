import {heartbeat, watch} from "@typesec/core";
import {warn} from "@typesec/tracer";
import {getHandle, ProtoAbstract, type MainArgs} from "@typesec/unit";
import {FileSystemRouter, type MatchedRoute, type Server} from "bun";
import path from "node:path";

export type ServeInput = {
    request: Request;
    route: MatchedRoute;
};

export class ServeProto extends ProtoAbstract<ServeInput> {
    public static readonly instances: Server[] = [];

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

    public static async run(args: MainArgs): Promise<void> {
        await watch(async () => {
            const router = this.createRouter(args);

            const server = Bun.serve({
                port: 3000,
                development: process.env.NODE_ENV === "development",
                fetch: async (request) => {
                    try {
                        const route = router.match(request);
                        if (route) {
                            const handle = getHandle(ServeProto, await import(route.filePath));

                            return await handle({request, route});
                        }
                    } catch (reason) {
                        if (reason instanceof Error) {
                            warn("Server error", reason);

                            return new Response(reason.message, {status: 500});
                        }

                        return new Response("Internal Server Error", {status: 500});
                    }

                    return new Response("Not found", {status: 404});
                },
            });

            this.instances.push(server);

            await heartbeat();

            return {
                [Symbol.asyncDispose]: async () => {
                    this.instances.splice(this.instances.indexOf(server), 1);
                    await server.stop();
                },
            };
        });
    }
}

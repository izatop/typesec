import {getHandle, ProtoAbstract, type MainArgs} from "@typesec/unit";
import {FileSystemRouter, type MatchedRoute} from "bun";
import {ok} from "node:assert";
import path from "node:path";

export type CLIInput = {
    request: string[];
    route: MatchedRoute;
};

export class CommandLineInterfaceProto extends ProtoAbstract<CLIInput> {
    public static validate(value: unknown): value is void {
        return typeof value === "undefined";
    }

    public static async run(args: MainArgs): Promise<void> {
        const router = new FileSystemRouter({
            dir: path.resolve(args.path),
            style: "nextjs",
            fileExtensions: [".mts"],
        });

        const [p = "/"] = process.argv.slice(2);
        const route = router.match(p);
        ok(route, `Route not found ${p}`);

        const module = await import(route.filePath);
        const handle = getHandle(this, module);
        await handle({request: process.argv, route});
    }
}

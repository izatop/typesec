import type {Rec, StringKeyOf} from "@typesec/the";
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

    public get argv(): string[] {
        return process.argv.slice(1);
    }

    public static async run(args: MainArgs): Promise<void> {
        const router = new FileSystemRouter({
            dir: path.resolve(args.path),
            style: "nextjs",
            fileExtensions: [".mts", ".mjs"],
        });

        const [p = "/"] = process.argv.slice(2);
        const route = router.match(p);
        ok(route, `Route not found ${p}`);

        const module = await import(route.filePath);
        const handle = getHandle(this, module);
        await handle({request: process.argv, route});
    }

    public table<T extends Rec>(name: string, table: T[], pick?: StringKeyOf<T>[]) {
        process.stdout.write(name + "\n" + Bun.inspect.table(table, pick, {colors: true}) + "\n");
    }

    public verticalTable<T extends Rec, K extends keyof T>(name: string, data: T[], id?: K) {
        const table = [];
        for (const row of data) {
            if (table.length > 0) {
                table.push({key: "--"});
            }

            id && table.push({key: "row", value: row[id]});
            table.push(
                ...Object.entries(row)
                    .filter(([key]) => key !== id)
                    .map(([key, value]) => ({key, value})),
            );
        }

        process.stdout.write(name + "\n" + Bun.inspect.table(table, {colors: true}) + "\n");
    }
}

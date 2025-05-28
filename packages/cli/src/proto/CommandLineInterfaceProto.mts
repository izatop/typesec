import {dispose} from "@typesec/core";
import type {Rec, StringKeyOf} from "@typesec/the";
import {getHandle, ProtoAbstract, type MainArgs} from "@typesec/unit";
import {FileSystemRouter, type MatchedRoute} from "bun";
import {ok} from "node:assert";
import path from "node:path";
import {crush} from "radash";
import {ArgvParser, type ArgvOption, type OptionPattern} from "../index.mjs";

export type CLIInput = {
    request: string[];
    route: MatchedRoute;
};

export class CommandLineInterfaceProto extends ProtoAbstract<CLIInput> {
    readonly #argv = new ArgvParser({});

    public static validate(value: unknown): value is void {
        return typeof value === "undefined";
    }

    public get argv(): string[] {
        return process.argv.slice(1);
    }

    public option<T extends string>(pattern: OptionPattern<T>): ArgvParser<Rec<T, ArgvOption<T, false>>>;
    public option<T extends string>(
        pattern: OptionPattern<T>,
        required: false,
    ): ArgvParser<Rec<T, ArgvOption<T, false>>>;
    public option<T extends string, R extends boolean>(
        pattern: OptionPattern<T>,
        required: R,
    ): ArgvParser<Rec<T, ArgvOption<T, R>>>;
    public option<T extends string>(
        pattern: OptionPattern<T>,
        required = false,
    ): ArgvParser<Rec<T, ArgvOption<T, boolean>>> {
        return this.#argv.option(pattern, required);
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
        const res = await args.ready?.();
        await handle({request: process.argv, route});
        await dispose(res);
    }

    public table<T extends Rec>(name: string, table: T[], pick?: StringKeyOf<T>[]) {
        process.stdout.write(
            name +
                "\n" +
                Bun.inspect.table(
                    table.map((t) => crush(t)),
                    pick,
                    {colors: true},
                ) +
                "\n",
        );
    }

    public verticalTable<T extends Rec, K extends keyof T>(name: string, data: T[], id?: K) {
        const table = [];
        for (const row of data) {
            if (table.length > 0) {
                table.push({key: "--"});
            }

            id && table.push({key: "row", value: row[id]});
            table.push(
                ...Object.entries(crush(row))
                    .filter(([key]) => key !== id)
                    .map(([key, value]) => ({key, value})),
            );
        }

        process.stdout.write(name + "\n" + Bun.inspect.table(table, {colors: true}) + "\n");
    }
}

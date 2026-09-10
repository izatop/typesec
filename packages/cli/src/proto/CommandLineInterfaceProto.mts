import {dispose} from "@typesec/core";
import type {Rec, StringKeyOf} from "@typesec/the";
import {assert} from "@typesec/the/assert";
import {wrap} from "@typesec/tracer";
import {getHandle, ProtoAbstract, type MainArgs} from "@typesec/unit";
import {FileSystemRouter, type MatchedRoute} from "bun";
import path from "node:path";
import {crush} from "radash";
import {ArgvParser, type ArgvOption, type OptionPattern} from "../index.mjs";

/**
 * What a CLI entrypoint receives: the raw argv and the route that matched.
 * @category cli
 */
export type CLIInput = {
    request: string[];
    route: MatchedRoute;
};

/**
 * The CLI protocol: file-system routing over argv, with option parsing and table output.
 *
 * Directories under the application's `app` folder become the command tree, and a command's default export is its handler.
 * @category cli
 * @category protocol
 */
export class CommandLineInterfaceProto extends ProtoAbstract<CLIInput> {
    readonly #argv = new ArgvParser({});

    /** A CLI command returns nothing; anything else is a protocol error. */
    public static validate(value: unknown): value is void {
        return typeof value === "undefined";
    }

    /** The process arguments, without the interpreter path. */
    public get argv(): string[] {
        return process.argv.slice(1);
    }

    /** Starts an option parser for this command. */
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

    /** Routes the given arguments to a command and runs it. */
    public static async runWith(args: MainArgs, argv: string[]): Promise<void> {
        const logger = wrap("cli");
        logger.log("run( <%s> )", args.path);
        const router = new FileSystemRouter({
            dir: path.resolve(args.path),
            style: "nextjs",
            fileExtensions: [".mjs", ".mts"],
        });

        const [p = "/"] = argv;
        const route = router.match(p);
        logger.log("match( <%s> ): %s", p, route?.src ?? null);
        assert(route, `Route "${p}" not found`);

        logger.log("import( <%s> )", route.src);
        const module = await import(route.filePath);
        const handle = getHandle(this, module);
        const res = await args.ready?.();

        logger.info("run( <%s> ): %s", route.pathname, handle.meta.name);
        await handle({request: process.argv, route});
        logger.info("finish( <%s> )", route.src);

        await dispose(res);
    }

    /** Routes `process.argv` to a command and runs it. */
    public static async run(args: MainArgs): Promise<void> {
        return this.runWith(args, process.argv.slice(2));
    }

    /**
     * Prints rows as a table, one row per record.
     * @example proto.table("Users", users, ["id", "email"])
     */
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

    /** Prints rows as key-value blocks, for records too wide for columns. */
    public verticalTable<T extends Rec, K extends keyof T>(name: string, data: T[], id?: K) {
        const table = [];
        for (const row of data) {
            if (table.length > 0) {
                table.push({key: "--"});
            }

            if (id) table.push({key: "row", value: row[id]});

            table.push(
                ...Object.entries(crush(row))
                    .filter(([key]) => key !== id)
                    .map(([key, value]) => ({key, value})),
            );
        }

        process.stdout.write(name + "\n" + Bun.inspect.table(table, {colors: true}) + "\n");
    }
}

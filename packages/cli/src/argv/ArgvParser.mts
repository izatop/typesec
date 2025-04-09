import type {Expand, Rec} from "@typesec/the";
import {ArgvOption} from "./ArgvOption.mjs";
import type {OptionPattern, ParseOptions} from "./interfaces.mjs";

export class ArgvParser<O extends Rec<string, ArgvOption<string, boolean>>> {
    readonly #options: O;
    readonly #defaultArgv: string[];

    constructor(options: O, argv?: string[]) {
        this.#options = options;
        this.#defaultArgv = argv ?? process.argv;
    }

    public option<T extends string>(pattern: OptionPattern<T>): ArgvParser<O & Rec<T, ArgvOption<T, false>>>;
    public option<T extends string>(
        pattern: OptionPattern<T>,
        required: false,
    ): ArgvParser<O & Rec<T, ArgvOption<T, false>>>;
    public option<T extends string, R extends boolean>(
        pattern: OptionPattern<T>,
        required: R,
    ): ArgvParser<O & Rec<T, ArgvOption<T, R>>>;
    public option<T extends string>(
        pattern: OptionPattern<T>,
        required = false,
    ): ArgvParser<O & Rec<T, ArgvOption<T, boolean>>> {
        const option = ArgvOption.from(pattern, required);

        return new ArgvParser({
            ...this.#options,
            [option.name]: option,
        });
    }

    public parse(argv: string[] = this.#defaultArgv): Expand<ParseOptions<O>> {
        const args = argv.slice();
        const result: Rec<string, string | undefined> = {};
        const options = Object.values(this.#options);

        while (args.length > 0) {
            const arg = args.shift();
            const matched = options.find((option) => option.match(arg));
            if (matched) {
                result[matched.name] = matched.validate(args.shift());
            }
        }

        return result as Expand<ParseOptions<O>>;
    }
}

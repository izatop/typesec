import {procedure} from "../procedure.mts";
import {backend} from "./context.mts";
import {AsyncGeneratorContract, StringCountContract} from "./contracts.mts";
import {TestDomain} from "./domain.mts";

export const MyBackend = backend(TestDomain, {
    strings: {
        count: procedure(StringCountContract, ({context, input}) => context.abs(input.length)),
        generator: procedure(AsyncGeneratorContract, async function* ({input: {chars, max}}) {
            for (let i = 0; i < max; i++) {
                yield chars[Math.floor(Math.random() * chars.length)];
            }
        }),
    },
});

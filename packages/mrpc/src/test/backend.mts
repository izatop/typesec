import {procedure} from "../procedure.mts";
import {backend} from "./context.mts";
import {StringCountContract} from "./contracts.mts";
import {TestDomain} from "./domain.mts";

export const MyBackend = backend(TestDomain, {
    strings: {
        count: procedure(StringCountContract, ({context, input}) => context.abs(input.length)),
    },
});

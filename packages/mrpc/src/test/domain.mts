import {domain} from "../domain.mts";
import {AsyncContract, StringCountContract} from "./contracts.mts";

export const TestDomain = domain("TestDomain", {
    strings: {
        async: AsyncContract,
        count: StringCountContract,
        //generator: AsyncGeneratorContract,
    },
});

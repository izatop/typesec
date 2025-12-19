import {domain} from "../domain.mts";
import {AsyncGeneratorContract, StringCountContract} from "./contracts.mts";

export const TestDomain = domain("TestDomain", {
    strings: {
        count: StringCountContract,
        generator: AsyncGeneratorContract,
    },
});

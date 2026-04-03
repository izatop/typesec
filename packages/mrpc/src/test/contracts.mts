import z from "zod";
import {contract} from "../contract.mjs";
import {subscription} from "../subscription.mjs";

export const StringCountContract = contract({input: z.string(), output: z.number()});

export const AsyncContract = contract({output: z.number()});

export const AsyncGeneratorContract = contract({
    input: z.object({max: z.int(), chars: z.array(z.string().min(1).max(1))}),
    output: subscription(z.string()),
});

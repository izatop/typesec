import z from "zod";
import {contract} from "../contract.mts";

export const StringCountContract = contract({input: z.string(), output: z.number()});

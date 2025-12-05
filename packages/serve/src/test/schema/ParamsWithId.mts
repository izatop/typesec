import z from "zod";

export const ParamsWithId = z.object({id: z.coerce.number()});

import z from "zod";

export const UserType = z.object({
    id: z.number(),
    name: z.string(),
});

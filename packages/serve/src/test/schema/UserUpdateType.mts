import z from "zod";

export const UserUpdateType = z.strictObject({
    name: z.string(),
});

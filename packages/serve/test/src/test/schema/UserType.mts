import * as v from "valibot";

export const UserType = v.strictObject({
    id: v.number(),
    name: v.string(),
});

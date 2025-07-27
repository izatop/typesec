import * as v from "valibot";

export const UserUpdateType = v.strictObject({
    name: v.string(),
});

import * as v from "valibot";

export const ParamsWithId = v.strictObject({
    id: v.pipe(
        v.string(),
        v.transform((v) => Number(v)),
        v.number(),
    ),
});

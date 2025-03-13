import * as v from "valibot";
import response from "../../../../../src/response/index.mjs";
import {route} from "../../../../../src/router/route.mjs";
import app from "../../index.mjs";

const params = v.strictObject({
    id: v.pipe(
        v.string(),
        v.transform((v) => Number(v)),
        v.number(),
    ),
});
const query = v.strictObject({fields: v.optional(v.array(v.string()))});

export default route({app, name: "Get"})
    .use({params, query})
    .as(response.json)
    .get(function handle({proto}) {
        return {
            id: proto.params().id,
        };
    });

import * as v from "valibot";
import {response, useParams} from "../../../../../src/index.mjs";
import {route} from "../../../../../src/router/route.mjs";
import app from "../../index.mjs";
import {ParamsWithId} from "../../schema/ParamsWithId.mjs";
import {UserType} from "../../schema/UserType.mjs";

export default route({app, name: "Get a User"})
    .use({args: useParams(ParamsWithId)})
    .as(v.pipe(UserType, response.Json))
    .get(function get({proto}) {
        const {id} = proto.parse("args");

        return {
            id,
            name: "Dave",
        };
    });

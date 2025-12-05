import z from "zod";
import {response, useParams} from "../../../index.mts";
import {route} from "../../../router/route.mts";
import app from "../../index.mjs";
import {ParamsWithId} from "../../schema/ParamsWithId.mjs";
import {UserType} from "../../schema/UserType.mjs";

export default route({app, name: "Get a User"})
    .use({args: useParams(ParamsWithId)})
    .as(z.pipe(UserType, response.Json))
    .get(function get({proto}) {
        const {id} = proto.parse("args");

        return {
            id,
            name: "Dave",
        };
    });

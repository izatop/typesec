import z from "zod";
import {request, response, route, useBody, useParams} from "../../../../index.mts";
import app from "../../../index.mjs";
import {ParamsWithId} from "../../../schema/ParamsWithId.mjs";
import {UserType} from "../../../schema/UserType.mjs";
import {UserUpdateType} from "../../../schema/UserUpdateType.mjs";

const body = useBody(request.Json.pipe(UserUpdateType));

export default route({app, name: "Update a User"})
    .use({body, args: useParams(ParamsWithId)})
    .as(z.pipe(UserType, response.Json))
    .get(async function update({proto}) {
        const body = await proto.parse("body");

        return {
            id: proto.parse("args").id,
            name: body.name,
        };
    });

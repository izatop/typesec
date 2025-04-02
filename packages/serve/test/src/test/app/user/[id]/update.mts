import * as v from "valibot";
import {request, response, useBody, useParams} from "../../../../../../src/index.mjs";
import {route} from "../../../../../../src/router/route.mjs";
import app from "../../../index.mjs";
import {ParamsWithId} from "../../../schema/ParamsWithId.mjs";
import {UserType} from "../../../schema/UserType.mjs";
import {UserUpdateType} from "../../../schema/UserUpdateType.mjs";

const body = useBody(v.pipeAsync(request.json, UserUpdateType));

export default route({app, name: "Update a User"})
    .use({body, args: useParams((rec) => v.parse(ParamsWithId, rec))})
    .as(v.pipe(UserType, response.json))
    .get(async function update({proto}) {
        const body = await proto.parse("body");

        return {
            id: proto.parse("args").id,
            name: body.name,
        };
    });

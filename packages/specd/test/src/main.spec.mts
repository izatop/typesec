import {randomBytes, randomInt} from "node:crypto";
import {withContext} from "../../src/spec.mjs";
import {TMySpecRef, TUserSpaceSpecRef, TUserSpecRef} from "./main.ref.mjs";
import {MyContext} from "./spec/context.mjs";

const mySpec = withContext(MyContext);

export const TEST_VERSION = randomInt(10000);

export const UserSpec = mySpec(TUserSpecRef, {
    id: () => 1,
    age: ({source}) => new Date().getFullYear() - source.bd.getFullYear(),
    friendsCount: ({source}) => source.friends.length,
    parent: ({context, source}) => context.users.find((u) => u.id === source.parentId),
    friends: ({context, source}) => context.users.filter((u) => u.friends.includes(source.id)),
});

export const UserSpaceSpec = mySpec(TUserSpaceSpecRef, {
    friends: ({context, input}) => context.users.filter((u) => u.friends.includes(input.ofUserId)),
    search: ({context, input}) => context.users.filter((u) => u.name.includes(input.q)),
    user: ({context, input}) => context.users.find((u) => u.id === input.id),
    code: () => randomBytes(8).toString("hex"),
    union: () => (Math.random() % 2 ? 1n : 1),
    me: ({context}) => context.users.find(Boolean),
});

export const MySpec = mySpec(TMySpecRef, {
    version: Math.random(),
    users: ({context}) => context.users,
});

export default MySpec;

// async function main() {
//     const value = await MySpec.resolve({
//         version: 1,
//         users: {
//             search: "*",
//             bigint: (v) => v ?? 0n,
//             bool: (v) => (v === true ? 1 : 2),
//             me: {
//                 id: 1,
//                 name: 1,
//                 friendsCount: 1,
//                 friends: {
//                     id: 1,
//                     name: 1,
//                     friendsCount: 1,
//                 },
//             },
//         },
//     });

//     const c = console.log;
//     c(
//         // test
//         value.version,
//         value.users,
//         value.users.search[0].id,
//         value.users.bigint,
//         value.users.bool,
//         value.users.me.id,
//         value.users.me.friendsCount,
//         value.users.me.friends,
//         value.users.me.friends[0].id,
//         value.users.me.friends[0].name,
//     );
// }

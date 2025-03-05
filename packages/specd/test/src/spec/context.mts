import type {IContext} from "../main.mjs";

export const MyContext: IContext = {
    users: [
        {
            id: 1,
            bd: new Date(),
            friends: [2],
            name: "Bob",
            weight: 72,
            registeredAt: new Date("2025-01-12T12:06:41.151Z"),
        },
        {
            id: 2,
            bd: new Date(),
            friends: [1, 3],
            name: "Mike",
            weight: 81,
            registeredAt: new Date("2025-01-12T12:06:41.151Z"),
        },
        {
            id: 3,
            bd: new Date(),
            friends: [],
            name: "Nika",
            weight: 52,
            registeredAt: new Date("2025-01-12T12:06:41.151Z"),
        },
    ],
};

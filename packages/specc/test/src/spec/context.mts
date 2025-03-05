import type {IContext} from "./interfaces.mjs";

export const MyContext: IContext = {
    users: [
        {
            id: 1,
            name: "Bob",
        },
        {
            id: 2,
            name: "Alice",
        },
    ],
    todos: [
        {
            id: 1,
            title: "Done TypeSec project",
            status: "pending",
            userId: 1,
        },
        {
            id: 2,
            status: "created",
            title: "New feature",
            description: "Think about new feature",
            userId: 1,
        },
        {
            id: 3,
            status: "done",
            title: "Write specification compiler",
            userId: 2,
            checklist: [
                {
                    id: 1,
                    description: "Read typescript AST documentation",
                    done: true,
                },
                {
                    id: 2,
                    description: "Write the AST Traverser",
                    done: true,
                },
                {
                    id: 3,
                    description: "Write the Code Generator",
                    done: false,
                },
            ],
        },
    ],
};

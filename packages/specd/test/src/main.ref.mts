import {Reflection} from "@typesec/specd";
import type {ID, Spec, SpecOf, Input} from "@typesec/spec";
import type {TMySpec, TUserSpec, TOfUserId, TUserSpaceSpec} from "./main.mjs";

export type TUserSpaceSpecUserInput = Spec<{id: ID}>;

export type TUserSpaceSpecSearchInput = Spec<{q: string}>;

export const TMySpecRef = new Reflection<TMySpec>("TMySpec", [
    {
        "name": "version",
        "flags": 0,
        "kind": "number"
    },
    {
        "name": "users",
        "flags": 0,
        "reference": "TUserSpaceSpec",
        "kind": "reference"
    }
]);

export const TUserSpecRef = new Reflection<TUserSpec>("TUserSpec", [
    {
        "name": "id",
        "flags": 0,
        "reference": "ID",
        "kind": "reference"
    },
    {
        "name": "name",
        "flags": 0,
        "kind": "string"
    },
    {
        "name": "friends",
        "flags": 0,
        "args": [
            {
                "name": "<T>",
                "flags": 0,
                "args": [
                    {
                        "name": "<T>",
                        "flags": 0,
                        "reference": "TUserSpec",
                        "kind": "reference"
                    }
                ],
                "kind": "Array<T>"
            }
        ],
        "kind": "Mutator<T>"
    },
    {
        "name": "friendsCount",
        "flags": 0,
        "kind": "number"
    },
    {
        "name": "weight",
        "flags": 1,
        "kind": "number"
    },
    {
        "name": "age",
        "flags": 1,
        "kind": "number"
    },
    {
        "name": "parent",
        "flags": 1,
        "reference": "TUserSpec",
        "kind": "reference"
    },
    {
        "name": "registeredAt",
        "flags": 0,
        "reference": "Date",
        "kind": "reference"
    }
]);

export const TOfUserIdRef = new Reflection<TOfUserId>("TOfUserId", [
    {
        "name": "ofUserId",
        "flags": 0,
        "reference": "ID",
        "kind": "reference"
    }
]);

export const TUserSpaceSpecRef = new Reflection<TUserSpaceSpec>("TUserSpaceSpec", [
    {
        "name": "bool",
        "flags": 1,
        "kind": "boolean"
    },
    {
        "name": "code",
        "flags": 3,
        "members": [
            {
                "name": "code",
                "flags": 1,
                "kind": "number"
            },
            {
                "name": "code",
                "flags": 1,
                "kind": "bigint"
            },
            {
                "name": "code",
                "flags": 1,
                "kind": "string"
            }
        ],
        "kind": "union"
    },
    {
        "name": "user",
        "flags": 0,
        "args": [
            {
                "reference": "TUserSpaceSpecUserInput",
                "name": "<TInput>",
                "kind": "reference",
                "flags": 0
            },
            {
                "name": "TValue",
                "flags": 2,
                "reference": "TUserSpec",
                "kind": "reference"
            }
        ],
        "kind": "Input<TInput, TValue>"
    },
    {
        "name": "search",
        "flags": 0,
        "args": [
            {
                "reference": "TUserSpaceSpecSearchInput",
                "name": "<TInput>",
                "kind": "reference",
                "flags": 0
            },
            {
                "name": "TValue",
                "flags": 0,
                "args": [
                    {
                        "name": "<T>",
                        "flags": 0,
                        "reference": "TUserSpec",
                        "kind": "reference"
                    }
                ],
                "kind": "Array<T>"
            }
        ],
        "kind": "Input<TInput, TValue>"
    },
    {
        "name": "friends",
        "flags": 0,
        "args": [
            {
                "reference": "TOfUserId",
                "name": "<TInput>",
                "kind": "reference",
                "flags": 0
            },
            {
                "name": "TValue",
                "flags": 0,
                "args": [
                    {
                        "name": "<T>",
                        "flags": 0,
                        "reference": "TUserSpec",
                        "kind": "reference"
                    }
                ],
                "kind": "Array<T>"
            }
        ],
        "kind": "Input<TInput, TValue>"
    },
    {
        "name": "union",
        "flags": 0,
        "members": [
            {
                "name": "union",
                "flags": 0,
                "kind": "number"
            },
            {
                "name": "union",
                "flags": 0,
                "kind": "bigint"
            }
        ],
        "kind": "union"
    },
    {
        "name": "me",
        "flags": 0,
        "reference": "TUserSpec",
        "kind": "reference"
    }
]);

export const TUserSpaceSpecUserInputRef = new Reflection<TUserSpaceSpecUserInput>("TUserSpaceSpecUserInput", [
    {
        "name": "id",
        "flags": 0,
        "reference": "ID",
        "kind": "reference"
    }
]);

export const TUserSpaceSpecSearchInputRef = new Reflection<TUserSpaceSpecSearchInput>("TUserSpaceSpecSearchInput", [
    {
        "name": "q",
        "flags": 0,
        "kind": "string"
    }
]);
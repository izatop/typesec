import {Reflection} from "@typesec/specd";
import type {ID, Spec, SpecOf, Input} from "@typesec/spec";
import type {TUserSpec, TCheckListSpec, TTodoSpec} from "./main.mjs";

export type TTodoSpecChecklistInput = Spec<{done?: boolean}>;

export const TUserSpecRef = new Reflection<TUserSpec>("TUserSpec", [
    {
        "name": "id",
        "flags": 0,
        "kind": "number"
    },
    {
        "name": "name",
        "flags": 0,
        "kind": "string"
    }
]);

export const TCheckListSpecRef = new Reflection<TCheckListSpec>("TCheckListSpec", [
    {
        "name": "id",
        "flags": 0,
        "reference": "ID",
        "kind": "reference"
    },
    {
        "name": "description",
        "flags": 0,
        "kind": "string"
    },
    {
        "name": "done",
        "flags": 0,
        "kind": "boolean"
    }
]);

export const TTodoSpecRef = new Reflection<TTodoSpec>("TTodoSpec", [
    {
        "name": "id",
        "flags": 0,
        "reference": "ID",
        "kind": "reference"
    },
    {
        "name": "title",
        "flags": 0,
        "kind": "string"
    },
    {
        "name": "status",
        "flags": 0,
        "reference": "TodoStatus",
        "kind": "reference"
    },
    {
        "name": "user",
        "flags": 0,
        "reference": "TUserSpec",
        "kind": "reference"
    },
    {
        "name": "checklist",
        "flags": 0,
        "args": [
            {
                "reference": "TTodoSpecChecklistInput",
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
                        "reference": "TCheckListSpec",
                        "kind": "reference"
                    }
                ],
                "kind": "Array<T>"
            }
        ],
        "kind": "Input<TInput, TValue>"
    },
    {
        "name": "attachments",
        "flags": 0,
        "args": [
            {
                "name": "<T>",
                "flags": 0,
                "args": [
                    {
                        "name": "<T>",
                        "flags": 0,
                        "kind": "string"
                    }
                ],
                "kind": "Array<T>"
            }
        ],
        "kind": "Mutator<T>"
    },
    {
        "name": "description",
        "flags": 0,
        "kind": "string"
    },
    {
        "name": "updatedAt",
        "flags": 0,
        "args": [
            {
                "name": "<T>",
                "flags": 0,
                "kind": "number"
            }
        ],
        "kind": "Mutator<T>"
    },
    {
        "name": "elapsedMs",
        "flags": 0,
        "kind": "number"
    }
]);

export const TTodoSpecChecklistInputRef = new Reflection<TTodoSpecChecklistInput>("TTodoSpecChecklistInput", [
    {
        "name": "done",
        "flags": 1,
        "kind": "boolean"
    }
]);
import {describe, expect, test} from "bun:test";

import {ApplicationException, AssertionException, NotFoundException, ValidationException} from "../../errors.mjs";

describe("framework exceptions", () => {
    test("should preserve native error details and arbitrary causes", () => {
        const cause = {code: "ENOENT", path: "/missing/config"};

        const exception = new ApplicationException("Startup failed", {cause});

        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("ApplicationException");
        expect(exception.message).toBe("Startup failed");
        expect(exception.cause).toBe(cause);
    });

    test("application branches should inherit the common base", () => {
        const cause = new Error("Original failure");

        const exceptions = [
            new ApplicationException("Application failed", {cause}),
            new AssertionException("Internal invariant failed", {cause}),
            new ValidationException("Invalid input", {cause}),
            new NotFoundException("Document not found", {cause}),
        ];

        expect(exceptions.map((exception) => exception.name)).toEqual([
            "ApplicationException",
            "AssertionException",
            "ValidationException",
            "NotFoundException",
        ]);

        for (const exception of exceptions) {
            expect(exception).toBeInstanceOf(Error);
            expect(exception).toBeInstanceOf(ApplicationException);
            expect(exception.cause).toBe(cause);
        }
    });

    test("custom application subclasses should inherit message, name and cause", () => {
        class MissingInvoiceException extends NotFoundException {}

        const cause = new Error("Lookup failed");

        const exception = new MissingInvoiceException("Invoice not found", {cause});

        expect(exception).toBeInstanceOf(NotFoundException);
        expect(exception).toBeInstanceOf(ApplicationException);
        expect(exception.name).toBe("MissingInvoiceException");
        expect(exception.message).toBe("Invoice not found");
        expect(exception.cause).toBe(cause);
    });

    test("assertion exceptions should retain their stable code and native cause", () => {
        const cause = new Error("Invariant failed");

        const exception = new AssertionException("Invalid state", {cause});

        expect(exception).toBeInstanceOf(ApplicationException);
        expect(exception.name).toBe("AssertionException");
        expect(exception.code).toBe("ERR_ASSERTION");
        expect(exception.cause).toBe(cause);
    });

    test("custom internal exceptions should only need the application base", () => {
        class StorageUnavailableException extends ApplicationException {}

        const cause = new Error("Connection failed");

        const exception = new StorageUnavailableException("Storage unavailable", {cause});

        expect(exception).toBeInstanceOf(ApplicationException);
        expect(exception).toBeInstanceOf(Error);
        expect(exception.name).toBe("StorageUnavailableException");
        expect(exception.cause).toBe(cause);
    });
});

import { describe, expect, it } from "vitest";
import {
  readLimitedJsonBody,
  RequestBodyTooLargeError,
} from "./readLimitedJsonBody";

describe("readLimitedJsonBody", () => {
  it("parses a JSON body within the byte limit", async () => {
    const request = new Request("http://localhost/test", {
      body: JSON.stringify({ action: "challenge" }),
      method: "POST",
    });

    await expect(readLimitedJsonBody(request, 1_024)).resolves.toEqual({
      action: "challenge",
    });
  });

  it("rejects an oversized stream when content-length is spoofed", async () => {
    const request = new Request("http://localhost/test", {
      body: JSON.stringify({ value: "x".repeat(1_024) }),
      headers: { "Content-Length": "0" },
      method: "POST",
    });

    await expect(readLimitedJsonBody(request, 64)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });
});

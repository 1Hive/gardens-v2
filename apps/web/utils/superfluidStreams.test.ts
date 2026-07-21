import { describe, expect, it } from "vitest";
import {
  getCurrentSenderFlowRate,
  getDisplayedIncomingFlowRate,
} from "./superfluidStreams";

const sender = "0xC6c2e9EFb898A42Db4137b07b727B45e0C353D81";

describe("getCurrentSenderFlowRate", () => {
  it("finds an active recreated stream after stopped historical revisions", () => {
    expect(
      getCurrentSenderFlowRate(
        [
          { sender: { id: sender }, currentFlowRate: "0" },
          { sender: { id: sender }, currentFlowRate: 0n },
          {
            sender: { id: sender.toLowerCase() },
            currentFlowRate: "1387366818873668",
          },
        ],
        sender,
      ),
    ).toBe(1387366818873668n);
  });

  it("sums active revisions for the sender and ignores other senders", () => {
    expect(
      getCurrentSenderFlowRate(
        [
          { sender: { id: sender }, currentFlowRate: "4" },
          { sender: { id: sender }, currentFlowRate: "6" },
          {
            sender: { id: "0x0000000000000000000000000000000000000001" },
            currentFlowRate: "20",
          },
        ],
        sender.toLowerCase(),
      ),
    ).toBe(10n);
  });

  it("returns null when the sender has no active stream", () => {
    expect(
      getCurrentSenderFlowRate(
        [{ sender: { id: sender }, currentFlowRate: "0" }],
        sender,
      ),
    ).toBeNull();
  });
});

describe("getDisplayedIncomingFlowRate", () => {
  it("does not let a zero direct lookup mask the aggregate rate", () => {
    expect(getDisplayedIncomingFlowRate(0n, 1387366818873668n)).toBe(
      1387366818873668n,
    );
  });

  it("prefers a positive direct rate", () => {
    expect(getDisplayedIncomingFlowRate(42n, 10n)).toBe(42n);
  });
});

import { describe, expect, it, vi } from "vitest";
import { ensureNotionRichTextSchema } from "./notion-schema";

const runRequest = <T>(_operation: string, request: () => Promise<T>) =>
  request();

describe("Notion data-source schema", () => {
  it("does not mutate a schema that already has the required property", async () => {
    const client = {
      dataSources: {
        retrieve: vi.fn().mockResolvedValue({
          properties: { Checksum: { type: "rich_text" } },
        }),
        update: vi.fn(),
      },
    };
    await ensureNotionRichTextSchema({
      client,
      dataSourceId: "campaign-706",
      propertyName: "Checksum",
      runRequest,
    });
    expect(client.dataSources.retrieve).toHaveBeenCalledWith({
      data_source_id: "campaign-706",
    });
    expect(client.dataSources.update).not.toHaveBeenCalled();
  });

  it("creates missing properties on the selected campaign data source", async () => {
    const client = {
      dataSources: {
        retrieve: vi.fn().mockResolvedValue({ properties: {} }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    await ensureNotionRichTextSchema({
      client,
      dataSourceId: "campaign-706",
      propertyName: "Breakdown",
      runRequest,
    });
    expect(client.dataSources.update).toHaveBeenCalledWith({
      data_source_id: "campaign-706",
      properties: { Breakdown: { rich_text: {} } },
    });
  });

  it("propagates schema failures so the caller cannot report success", async () => {
    const client = {
      dataSources: {
        retrieve: vi.fn().mockRejectedValue(new Error("Notion unavailable")),
        update: vi.fn(),
      },
    };
    await expect(
      ensureNotionRichTextSchema({
        client,
        dataSourceId: "campaign-706",
        propertyName: "Checksum",
        runRequest,
      }),
    ).rejects.toThrow("Notion unavailable");
    expect(client.dataSources.update).not.toHaveBeenCalled();
  });
});

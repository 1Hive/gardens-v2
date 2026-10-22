type NotionSchemaClient = {
  dataSources: {
    retrieve: (args: { data_source_id: string }) => Promise<{
      properties?: Record<string, { type?: string }>;
    }>;
    update: (args: {
      data_source_id: string;
      properties: Record<string, { rich_text: Record<string, never> }>;
    }) => Promise<unknown>;
  };
};

export const ensureNotionRichTextSchema = async ({
  client,
  dataSourceId,
  propertyName,
  runRequest,
}: {
  client: NotionSchemaClient;
  dataSourceId: string;
  propertyName: string;
  runRequest: <T>(operation: string, request: () => Promise<T>) => Promise<T>;
}) => {
  // Since Notion API 2025-09-03, schemas belong to data sources, not databases.
  const source = await runRequest(`retrieve ${propertyName} schema`, () =>
    client.dataSources.retrieve({ data_source_id: dataSourceId }),
  );
  if (source.properties?.[propertyName]?.type === "rich_text") return;

  await runRequest(`create ${propertyName} property`, () =>
    client.dataSources.update({
      data_source_id: dataSourceId,
      properties: { [propertyName]: { rich_text: {} } },
    }),
  );
};

type PointsEvent = {
  id?: number;
  event?: string;
  eventName?: string;
  account?: string;
  address?: string;
  points?: number;
  uniqueId?: string | null;
  createdAt?: string;
};

type PointsEventsResponse = {
  events?: PointsEvent[];
  pagination?: {
    page: number;
    limit: number;
    totalDocs: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

type PointsPushResponse = {
  message: string;
  pushRequestId: number;
  eventCount: number;
};

export type PointsClient = {
  getEvents: (args: {
    event?: string;
    limit?: number;
    offset?: number;
  }) => Promise<PointsEvent[]>;
  eventClient: {
    getEvents: (args: {
      query?: { limit?: number; offset?: number };
    }) => Promise<PointsEvent[]>;
    sendEvents: (
      batch: Array<{
        event: string;
        payload: { account: string; points: number; metadata?: any };
      }>,
    ) => Promise<PointsPushResponse>;
  };
};

const resolveBaseUrl = () =>
  process.env.SUPERFLUID_POINT_API_BASE_URL?.trim() ??
  "https://cms.superfluid.pro";

const normalizeLimit = (limit?: number) => {
  if (!limit || Number.isNaN(limit)) return 50;
  return Math.min(Math.max(1, Math.floor(limit)), 100);
};

const toPointsEvent = (evt: PointsEvent): PointsEvent => ({
  ...evt,
  event: evt.event ?? evt.eventName,
  eventName: evt.eventName ?? evt.event,
  account: evt.account ?? evt.address,
  address: evt.address ?? evt.account,
});

const fetchJson = async <T>(
  baseUrl: string,
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    query?: Record<string, string | number | undefined | null>;
    body?: any;
  } = {},
): Promise<T> => {
  const url = new URL(path, baseUrl);
  const { query } = options;
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    const message =
      json?.message ??
      json?.error ??
      `Superfluid Points API error (${res.status})`;
    throw new Error(message);
  }
  return json as T;
};

const cachedPointsClients = new Map<string, PointsClient>();

const createSuperfluidPointsClient = ({
  apiKey,
  campaignId,
  baseUrl,
}: {
  apiKey: string;
  campaignId: number;
  baseUrl: string;
}): PointsClient => {

  const getEvents = async ({
    event,
    limit,
    offset,
  }: {
    event?: string;
    limit?: number;
    offset?: number;
  }): Promise<PointsEvent[]> => {
    const requestedLimit = Number.isFinite(limit) ? Math.max(1, limit ?? 0) : 0;
    const pageLimit = normalizeLimit(requestedLimit || 100);
    const startOffset = Math.max(0, offset ?? 0);
    let page = Math.floor(startOffset / pageLimit) + 1;
    let offsetWithin = startOffset % pageLimit;
    const collected: PointsEvent[] = [];

    while (!requestedLimit || collected.length < requestedLimit) {
      const data = await fetchJson<PointsEventsResponse>(baseUrl, "/points/events", {
        query: {
          campaignId,
          eventName: event,
          limit: pageLimit,
          page,
        },
      });
      const events = (data.events ?? []).map(toPointsEvent);
      const slice = offsetWithin > 0 ? events.slice(offsetWithin) : events;
      collected.push(...slice);
      if (!data.pagination?.hasNextPage || events.length === 0) break;
      page += 1;
      offsetWithin = 0;
    }

    return requestedLimit ? collected.slice(0, requestedLimit) : collected;
  };

  const eventClient = {
    getEvents: async ({
      query,
    }: {
      query?: { limit?: number; offset?: number };
    }): Promise<PointsEvent[]> => {
      const requestedLimit =
        Number.isFinite(query?.limit) ? Math.max(1, query?.limit ?? 0) : 0;
      const pageLimit = normalizeLimit(requestedLimit || 100);
      const startOffset = Math.max(0, query?.offset ?? 0);
      let page = Math.floor(startOffset / pageLimit) + 1;
      let offsetWithin = startOffset % pageLimit;
      const collected: PointsEvent[] = [];

      while (!requestedLimit || collected.length < requestedLimit) {
        const data = await fetchJson<PointsEventsResponse>(baseUrl, "/points/events", {
          query: {
            campaignId,
            limit: pageLimit,
            page,
          },
        });
        const events = (data.events ?? []).map(toPointsEvent);
        const slice = offsetWithin > 0 ? events.slice(offsetWithin) : events;
        collected.push(...slice);
        if (!data.pagination?.hasNextPage || events.length === 0) break;
        page += 1;
        offsetWithin = 0;
      }

      return requestedLimit ? collected.slice(0, requestedLimit) : collected;
    },
    sendEvents: async (
      batch: Array<{
        event: string;
        payload: { account: string; points: number; metadata?: any };
      }>,
    ): Promise<PointsPushResponse> => {
      const events = batch.map((entry) => ({
        eventName: entry.event,
        account: entry.payload.account,
        points: entry.payload.points,
      }));
      return fetchJson<PointsPushResponse>(baseUrl, "/points/push", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey,
        },
        body: {
          campaignId,
          events,
        },
      });
    },
  };

  return {
    getEvents,
    eventClient,
  };
};

export const getSuperfluidPointsClientByEnv = ({
  apiKeyEnvVar,
  campaignIdEnvVar,
}: {
  apiKeyEnvVar: string;
  campaignIdEnvVar: string;
}): PointsClient => {
  const apiKey = process.env[apiKeyEnvVar];
  const campaignId = Number(process.env[campaignIdEnvVar] ?? "") || 0;
  if (!apiKey) {
    throw new Error(`${apiKeyEnvVar} is required`);
  }
  if (!campaignId) {
    throw new Error(`${campaignIdEnvVar} is required`);
  }
  const baseUrl = resolveBaseUrl();
  const cacheKey = `${baseUrl}|${campaignId}|${apiKey}`;
  const cached = cachedPointsClients.get(cacheKey);
  if (cached) return cached;
  const created = createSuperfluidPointsClient({ apiKey, campaignId, baseUrl });
  cachedPointsClients.set(cacheKey, created);
  return created;
};

export const getSuperfluidPointsClient = (): PointsClient => {
  return getSuperfluidPointsClientByEnv({
    apiKeyEnvVar: "SUPERFLUID_POINT_API_KEY",
    campaignIdEnvVar: "SUPERFLUID_POINT_SYSTEM_ID",
  });
};

export const STACK_DRY_RUN =
  (process.env.STACK_DRY_RUN ?? "").toLowerCase() === "true";

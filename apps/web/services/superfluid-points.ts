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

type PointsClient = {
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

const SUPERFLUID_POINTS_BASE_URL =
  process.env.SUPERFLUID_POINT_API_BASE_URL?.trim() ??
  "https://cms.superfluid.pro";

const resolveCampaignId = () =>
  Number(process.env.SUPERFLUID_POINT_SYSTEM_ID ?? "") || 0;

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
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    query?: Record<string, string | number | undefined | null>;
    body?: any;
  } = {},
): Promise<T> => {
  const url = new URL(path, SUPERFLUID_POINTS_BASE_URL);
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

let cachedPointsClient: PointsClient | null = null;

export const getSuperfluidPointsClient = (): PointsClient => {
  if (cachedPointsClient) return cachedPointsClient;
  const apiKey = process.env.SUPERFLUID_POINT_API_KEY;
  const campaignId = resolveCampaignId();
  if (!apiKey) {
    throw new Error("SUPERFLUID_POINT_API_KEY is required");
  }
  if (!campaignId) {
    throw new Error("SUPERFLUID_POINT_SYSTEM_ID is required");
  }

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
      const data = await fetchJson<PointsEventsResponse>("/points/events", {
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
        const data = await fetchJson<PointsEventsResponse>("/points/events", {
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
      return fetchJson<PointsPushResponse>("/points/push", {
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

  cachedPointsClient = {
    getEvents,
    eventClient,
  };
  return cachedPointsClient;
};

export const STACK_DRY_RUN =
  (process.env.STACK_DRY_RUN ?? "").toLowerCase() === "true";

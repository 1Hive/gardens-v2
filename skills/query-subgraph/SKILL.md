---
name: query-subgraph
description: Retrieve Gardens V2 indexed data by running direct GraphQL queries against the Gardens V2 subgraph endpoints. Use this skill when an external agent needs to answer Gardens questions, inspect entities, fetch on-chain indexed state, or choose the correct Gardens V2 dev endpoint for a specific network without relying on local repository access or writing application code.
---

# Query Subgraph

## Overview

Use the Gardens V2 subgraph schema and the hardcoded Graph Studio dev endpoints below to run direct GraphQL requests and return Gardens data.
Optimize for shell commands and one-off retrieval, not code changes.

## Workflow

1. Identify the target chain from the user request.
2. Select the matching hardcoded dev endpoint from this skill.
3. Check the schema before writing a new query or changing fields:
   `https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/pkg/subgraph/src/schema.graphql`
4. Write the smallest possible query that answers the user request.
5. Run the query directly with `curl` or PowerShell `Invoke-RestMethod`.
6. Return the relevant fields only, and explain any uncertainty if the schema does not clearly expose the requested data.

## Dev Endpoints

Use these exact Graph Studio endpoints for direct queries during development:

- Arbitrum Sepolia: `https://api.studio.thegraph.com/query/70985/gardens-v2---arbitrum-sepolia/version/latest`
- Optimism Sepolia: `https://api.studio.thegraph.com/query/70985/gardens-v-2-optimism-sepolia/version/latest`
- Arbitrum: `https://api.studio.thegraph.com/query/102093/gardens-v2---arbitrum/version/latest`
- Optimism: `https://api.studio.thegraph.com/query/102093/gardens-v2---optimism/version/latest`
- Polygon: `https://api.studio.thegraph.com/query/102093/gardens-v2---polygon/version/latest`
- Gnosis: `https://api.studio.thegraph.com/query/102093/gardens-v2---gnosis/version/latest`
- Base: `https://api.studio.thegraph.com/query/102093/gardens-v2---base/version/latest`
- Celo: `https://api.studio.thegraph.com/query/102093/gardens-v2---celo/version/latest`

These align with the chain configuration source:
`https://raw.githubusercontent.com/1Hive/gardens-v2/refs/heads/main/apps/web/configs/chains.tsx`

Keep the skill's default query targets pinned to the `/version/latest` form above.

## Command Patterns

Use GraphQL POST requests with a JSON body containing `query` and optional `variables`.

Prefer one of these execution patterns.

### `curl`

```bash
curl -s 'https://api.studio.thegraph.com/query/102093/gardens-v2---base/version/latest' \
  -H 'content-type: application/json' \
  --data-raw '{"query":"query GetGarden($id: ID!) { tokenGarden(id: $id) { id name symbol totalBalance } }","variables":{"id":"0x..."}}'
```

### PowerShell

```powershell
$body = @{
  query = 'query GetGarden($id: ID!) { tokenGarden(id: $id) { id name symbol totalBalance } }'
  variables = @{
    id = '0x...'
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Method Post `
  -Uri 'https://api.studio.thegraph.com/query/102093/gardens-v2---base/version/latest' `
  -ContentType 'application/json' `
  -Body $body
```

## Query Rules

- Request only the fields needed to answer the question.
- Use schema names exactly as defined in the subgraph schema.
- Filter early with `where`, `id`, `first`, `skip`, `orderBy`, and `orderDirection` when supported by the entity.
- Prefer stable identifiers such as entity `id`, addresses, proposal ids, pool ids, or strategy ids.
- If a field fails, verify the field name and entity against the schema before retrying.
- If the query is expensive or returns too much data, reduce the selection set before expanding it.

## Common Retrieval Patterns

Use these as templates and adapt the entity names or filters to the task.

### List recent entities

```json
{
  "query": "query ListItems { tokenGardens(first: 10, orderBy: createdAt, orderDirection: desc) { id name symbol } }"
}
```

### Fetch one entity by id

```json
{
  "query": "query GetById($id: ID!) { tokenGarden(id: $id) { id name symbol totalBalance } }",
  "variables": {
    "id": "0x..."
  }
}
```

### Filter a collection

```json
{
  "query": "query Filtered($strategy: String!) { cvproposals(where: { strategy: $strategy }, first: 20) { id proposalNumber metadata } }",
  "variables": {
    "strategy": "0x..."
  }
}
```

### Paginate

```json
{
  "query": "query Paged($skip: Int!) { members(first: 100, skip: $skip) { id memberAddress } }",
  "variables": {
    "skip": 0
  }
}
```

## Validation

- Re-check the schema link before introducing new fields or entities.
- Confirm the target network matches the chain-specific endpoint.
- If the response is empty, verify the chain first before assuming the entity does not exist.
- If the request fails, inspect the GraphQL error message and reduce the query to the smallest failing field.

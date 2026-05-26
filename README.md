# n8n-nodes-brightpearl

An [n8n](https://n8n.io) community node for the [Brightpearl](https://www.brightpearl.com) REST API. Covers sales orders, products, price lists, and order custom fields. Works as a standard n8n node and is `usableAsTool` for AI agents. (AI agents are currently untested with it.)

### _Disclaimer_
Most of the "code" portion of modifying the template into this was written with Claude in a day. Sort of a mixture of proof of concept and making something that works for some quick features I needed. I feel it's important to note that while I at best provided direction, it did the work of modifying things to ensure it would work with n8n properly. (I had done an attempt before, but some docs were out of date, so I fed what I had into Claude and let it do the rest.)

Claude did attempt to incorporate the rate limit handling per the API docs, but this is an untested option that I am not sure how n8n will operate with as of yet. 

## Installation

In your n8n instance:

**Settings → Community Nodes → Install** and enter:
```
n8n-nodes-brightpearl
```

Or via CLI on a self-hosted instance:
```bash
npm install n8n-nodes-brightpearl
```

## Authentication

Currently this node supports **Private App authentication only**, using the three Brightpearl headers:

- `brightpearl-account-token`
- `brightpearl-app-ref`
- `brightpearl-staff-token`

Create the credential in n8n with:

| Field | Where to find it |
|---|---|
| Account Code | The subdomain part of your Brightpearl URL |
| Datacenter Hostname | Match your account URL (e.g. `use1.brightpearlconnect.com`) |
| App Reference | Set when you create the private app under **Apps → Private Apps** |
| Account Token | Issued when the private app is created |
| Staff Token | The staff token for the user the app runs as |

OAuth (public app) support is planned but not yet implemented. If you aren't required to use oauth yet, or are fine with the limited api hits, it should work for now.

## Supported Operations

### Order
- **Get** — fetch a single sales order by ID
- **Get Many** — search sales orders with column-based filters; results _should_ auto-enriched with reference data labels (e.g. `orderStatusId: 5` gains `orderStatusName: "Complete - Cancelled"`)
- **Create** — create a new sales order with rows ***Currently Untested*** Please let me know if you do test this functionality. 
- **Update Status** — change order status, optionally with a note 
- **Get Custom Fields** — read all custom fields on an order
- **Update Custom Fields** — patch custom fields (set or remove individual fields via JSON Patch)

### Product
- **Get** — fetch a single product by ID
- **Get Many** — search products
- **Create** — create a new product   ***Currently Untested*** Please let me know if you do test this functionality. 

### Price List
- **Get Many** — list all price lists on the account  ***Currently Untested*** Please let me know if you do test this functionality. 
- **Get Product Prices** — get a product's prices on a specific price list  ***Currently Untested*** Please let me know if you do test this functionality. 
- **Set Product Price** — set or update a product's price (with optional quantity-break tiers)  ***Currently Untested*** Please let me know if you do test this functionality. 

## Rate Limiting

Brightpearl enforces a per-account quota. The node handles rate limits automatically:

- **HTTP 503** (quota exhausted) — waits the number of seconds in the `brightpearl-throttle-time` header before retrying
- **HTTP 429** (burst limit) — waits the number of seconds in the `Retry-After` header
- Up to **5 retries** per request, with a single wait capped at **60 seconds**

This is transparent to your workflow — if a transient throttle hits, the node sleeps and tries again with no extra configuration needed.

For batch workloads that intentionally pace themselves (e.g. updating thousands of orders), layer your own `Wait` node into the workflow. The in-node retry covers transient throttling, not long-term pacing.

> **Note on n8n Cloud:** the rate-limit retry uses `node:timers/promises` for sleeping, which n8n Cloud's sandbox doesn't allow. This package is therefore configured for **self-hosted n8n** and is not verifiable for n8n Cloud. If you specifically need Cloud verification, remove the retry loop from `GenericFunctions.ts` and switch `eslint.config.mjs` back to the `config` export from `@n8n/node-cli/eslint`.

## Reference Data Enrichment

Brightpearl search endpoints return rows as positional arrays plus a top-level `reference` block mapping coded values (status IDs, etc.) to display names. This node converts results to keyed objects and, for any column that declares `referenceData`, adds a sibling field with the resolved label:

- `orderStatusId: 5` → `orderStatusName: "Complete - Cancelled"`

There should also be an option to return the raw output if that is helpful for your use case. 

Columns ending in `Id` get a `Name` counterpart; other columns get a `Label` suffix. The resolution is automatic for any column Brightpearl flags with reference data.

## Links

- [Brightpearl API documentation](https://api-docs.brightpearl.com/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT

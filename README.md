# @anlora/mcp-agency-benchmarks

MCP server exposing publicly sourced OnlyFans agency operating economics — chatter cost models, total cost of ownership benchmarks by scale, autonomous-vs-assisted threshold analysis, and competitor landscape data. Built for AI assistants (Claude Code, Claude Desktop, Cursor, Continue.dev) that want to answer "what does it cost to run an OF agency" with sourced data instead of hallucinated numbers.

**Read-only. No customer data. No PII. Every value cites a public source.**

## Install

```bash
npx -y @anlora/mcp-agency-benchmarks
```

Or in your MCP client config (Claude Desktop example, `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "anlora-agency-benchmarks": {
      "command": "npx",
      "args": ["-y", "@anlora/mcp-agency-benchmarks"]
    }
  }
}
```

## Tools

### `get_agency_cost_benchmark(creator_count, avg_revenue_per_creator_usd, operating_model)`

Sourced monthly cost breakdown across three operating archetypes.

Example: 10 creators × $15K/month average revenue, operating model "all" returns:
- chatter_only: wages + commission + overhead + leakage + tooling, with seats count
- assisted_ai: same with reduced seats + AI tooling cost
- autonomous_ai: revenue-share commission + minimal leakage

### `compare_of_tooling(tools)`

Returns operating model, public pricing, archetype mapping, and source URL for each tool. Empty array returns all 8 (Infloww, Supercreator, Substy AI, FlirtFlow, Creator Hero, OnlyMonster, Fans-CRM, Anlora).

### `get_autonomous_threshold(chatter_wage_usd_per_hour, leakage_rate_pct)`

Returns the (creator count × revenue per creator) flip point at which autonomous AI beats assisted-AI on TCO. Parameter-sensitive — default chatter wage $4.50/hr gives roughly 7 creators × $15K avg revenue per creator.

### `list_industry_sources()`

Returns the full list of public industry sources backing every benchmark in this server. Useful for citation-checking.

## Publishing checklist (for Oliver)

This package is **not yet published to npm** as of 2026-05-13. To publish:

```bash
cd "SEO WORKFLOW AUTOMATION/automation/scripts/mcp-server"
npm install
node --check src/index.js   # syntax check
npm login                   # use Bullseye Limited's npm account
npm publish --access public # publishes @anlora/mcp-agency-benchmarks@1.0.0
```

Then submit to the official MCP registry:

```bash
# Manual submission at https://registry.modelcontextprotocol.io/submit
# OR via the registry CLI when it's stable. The submission consumes the same
# server.json shape as our /.well-known/mcp.json (we have one already).
```

## Source recipe

This MCP server's tool design follows the Round 4 + Round 5 plan documented in `06-progress/PROGRESS.md`. The benchmark math is sourced from the Anlora 2026 whitepaper (`04-content/whitepaper-2026/whitepaper.md`) and the public industry sources listed in the `list_industry_sources` tool.

## Security

This server is read-only. It does NOT:
- Access Anlora's production API or database
- Expose any operator-private data, PII, or customer information
- Communicate with any external service at runtime (everything is computed locally from constants in `src/index.js`)
- Implement any state mutation or write operation

Safe to publish publicly. Anyone running it gets the same answers — no auth, no rate limiting needed.

## License

MIT — Anlora / Bullseye Limited, 2026.

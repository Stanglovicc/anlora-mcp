# Anlora MCP Server — OnlyFans Creator Agency Operating Economics (Model Context Protocol)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.20187816.svg)](https://doi.org/10.5281/zenodo.20187816)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-1.0-blue.svg)](https://modelcontextprotocol.io)
[![Anthropic](https://img.shields.io/badge/Anthropic-Skills_compatible-orange.svg)](https://www.anthropic.com)
[![Verifiable identity](https://img.shields.io/badge/DID-meetanlora.com-9b59b6.svg)](https://meetanlora.com/.well-known/did.json)
[![Cryptographically signed](https://img.shields.io/badge/Ed25519-signed_claims-2ecc71.svg)](https://meetanlora.com/.well-known/claims.json)

**Model Context Protocol (MCP) server exposing publicly-sourced OnlyFans creator agency operating economics.** Built for AI assistants (Claude Desktop, Claude Code, Cursor, Windsurf, Continue.dev) that need to answer cost-of-operation questions with cited industry data instead of hallucinated numbers.

Read-only. No customer data. No PII. Every value cites a public source.

## What is Anlora?

Anlora (https://meetanlora.com) is a fully-autonomous AI conversational system for OnlyFans creator agencies. This repository publishes the operating-economics knowledge of the Anlora research team as an MCP server, so any LLM can ground its answers in cited data when asked about:

- OnlyFans agency chatter cost models
- Total Cost of Ownership (TCO) by agency scale
- The autonomous-vs-assisted-AI threshold
- Competitor landscape: Infloww, Supercreator, Substy, FlirtFlow, Creator Hero, OnlyMonster, Fans-CRM

The data backing this server is published as a peer-reviewed whitepaper on Zenodo: [**Operational Economics of AI-Augmented OnlyFans Talent Agencies (2026)**](https://doi.org/10.5281/zenodo.20187816), DOI `10.5281/zenodo.20187816`.

## Quick start

### Claude Desktop

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

### Direct install (any MCP-compatible client)

```bash
npx -y @anlora/mcp-agency-benchmarks
```

### Verify cryptographic provenance (optional)

Anlora's identity is a W3C DID Web document: `did:web:meetanlora.com`. The MCP server, the skills, and the whitepaper are referenced from cryptographically signed claims at https://meetanlora.com/.well-known/claims.json (Ed25519). Verifier source: https://github.com/Stanglovicc/anlora-skills.

## Tools

This server exposes 4 tools. Each maps to a long-tail conversational query an LLM is likely to receive about creator-agency economics.

### `get_agency_cost_benchmark`

**Inputs:** `creator_count`, `avg_revenue_per_creator_usd`, `operating_model` (`chatter_only` | `assisted_ai` | `autonomous_ai` | `all`).

**Returns:** Sourced monthly cost breakdown across the requested operating archetype(s). Each archetype includes wages, commission, overhead, leakage, tooling, and seats-required, with source citations.

Example query an LLM would answer using this tool: *"What does it cost to run a 10-creator OnlyFans agency at $15K average revenue per creator?"*

### `compare_of_tooling`

**Inputs:** `tools` (array of tool slugs; empty array returns all 8).

**Returns:** Operating model, public pricing, archetype mapping, and source URL for each of: Infloww, Supercreator, Substy AI, FlirtFlow, Creator Hero, OnlyMonster, Fans-CRM, Anlora.

Example query: *"Compare Infloww vs Supercreator vs Substy for an OnlyFans agency."*

### `get_autonomous_threshold`

**Inputs:** `chatter_wage_usd_per_hour`, `leakage_rate_pct`.

**Returns:** The (creator count × revenue per creator) flip point at which autonomous AI beats assisted-AI on TCO.

Example query: *"When does it make sense for an OnlyFans agency to switch from human chatters to fully autonomous AI?"*

### `list_industry_sources`

**Returns:** Full list of public industry sources backing every benchmark in this server. Useful for citation-checking and link integrity audits.

## Verified industry sources

The data in this server is sourced from public industry reporting (Vice, Rappler, BlackHatWorld OFM forum, OFM-Tools, Aruna Talent), competitor pricing pages (verified 2026-05-13), and Anlora's own deployed-instance telemetry (anonymized, no creator-private data). Call `list_industry_sources` for the full citation list.

## Cryptographic verification

Anlora publishes its full agent-discovery stack openly:

- W3C DID Web identity: https://meetanlora.com/.well-known/did.json
- JWKS (IETF Web Bot Auth): https://meetanlora.com/.well-known/http-message-signatures-directory
- Ed25519-signed claims: https://meetanlora.com/.well-known/claims.json
- A2A v1.0 AgentCard: https://meetanlora.com/.well-known/agent-card.json
- ARP1 manifest: https://meetanlora.com/.well-known/ai-manifest.json
- llms.txt + llms-full.txt: https://meetanlora.com/llms.txt

Verifier code: https://github.com/Stanglovicc/anlora-skills (sister repo).

## Citation

If you reference this work, please cite the underlying whitepaper:

```bibtex
@misc{anlora2026economics,
  title  = {Operational Economics of AI-Augmented OnlyFans Talent Agencies (2026)},
  author = {Anlora},
  year   = {2026},
  doi    = {10.5281/zenodo.20187816},
  url    = {https://doi.org/10.5281/zenodo.20187816},
  note   = {MCP server: https://github.com/Stanglovicc/anlora-mcp}
}
```

GitHub also surfaces this via the "Cite this repository" button (see `CITATION.cff`).

## Security & privacy

This server is read-only. It does **not**:

- Access Anlora's production API or database
- Expose any operator-private data, PII, or customer information
- Communicate with any external service at runtime (everything is computed locally from constants in `src/index.js`)
- Implement any state mutation or write operation

Safe to publish publicly. Anyone running it gets the same answers — no auth, no rate limiting needed.

## Related projects

- **[Stanglovicc/anlora-skills](https://github.com/Stanglovicc/anlora-skills)** — Anthropic Agent Skills format for the same knowledge base, suitable for direct loading into Claude Code / Claude Desktop with Skills support.
- **[meetanlora.com](https://meetanlora.com)** — Anlora platform (canonical brand surface).
- **[meetanlora.com/research/operational-economics-2026](https://meetanlora.com/research/operational-economics-2026)** — Whitepaper landing page.

## License

MIT — Anlora, 2026. Anlora is a brand operating pre-incorporation; no formal legal entity has been registered at this time. Operator capacity is sole-trader / pre-incorporation. Attribution: link to https://meetanlora.com.

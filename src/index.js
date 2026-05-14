#!/usr/bin/env node
/**
 * @anlora/mcp-agency-benchmarks
 *
 * MCP server exposing publicly sourced OnlyFans agency operating economics.
 * Read-only — no operator-private data, no PII. Every value comes from a
 * publicly cited industry source documented in the response payloads.
 *
 * Tools exposed:
 *   - get_agency_cost_benchmark(creators, revenue_per_creator_usd, operating_model)
 *   - compare_of_tooling(tools)
 *   - get_autonomous_threshold(chatter_wage_usd_per_hour, leakage_rate_pct)
 *   - list_industry_sources()
 *
 * Runs over stdio (the standard MCP transport for Claude Desktop / Cursor /
 * Continue.dev). Discoverable via:
 *   - https://meetanlora.com/.well-known/mcp.json (canonical manifest)
 *   - registry.modelcontextprotocol.io (official MCP registry — submit on publish)
 *   - npx -y @anlora/mcp-agency-benchmarks (direct install command)
 *
 * See ../README.md for full integration instructions.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Publicly cited industry sources (every benchmark in this MCP server traces
// back to one of these — explicit so any output is verifiable).
const SOURCES = {
  vice_2023: { url: "https://www.vice.com/en/article/onlyfans-management-agency-chatters/", topic: "Vice — investigative report on offshore OnlyFans chatter wages" },
  rappler_2024: { url: "https://www.rappler.com/newsbreak/in-depth/behind-onlyfans-filipino-workers-edit-sell-sex-content-foreign-models/", topic: "Rappler — Filipino OnlyFans ghostwriter coverage" },
  blackhatworld_2024: { url: "https://www.blackhatworld.com/forums/onlyfans-management.703/", topic: "BlackHatWorld OFM forum — operator wage discussions" },
  ofm_tools_2024: { url: "https://ofm-tools.com/how-to-hire-onlyfans-chatters/", topic: "OFM-Tools — How to Hire OnlyFans Chatters" },
  aruna_talent_2024: { url: "https://arunatalent.com/blog/onlyfans-agency-commission-rates/", topic: "Aruna Talent — OnlyFans Agency Commission Rates" },
  infloww_pricing: { url: "https://infloww.com/pricing", topic: "Infloww public pricing page" },
  supercreator_pricing: { url: "https://supercreator.ai/pricing", topic: "Supercreator public pricing page (canonical domain; 308-redirects to app.supercreator.ai/pricing)" },
  substy_pricing: { url: "https://substy.ai/pricing", topic: "Substy AI public pricing page" },
  flirtflow_pricing: { url: "https://flirtflow.io/home-pages/pricing", topic: "FlirtFlow public pricing page" },
  creator_hero_pricing: { url: "https://creator-hero.com/pricing", topic: "Creator Hero public pricing page" },
  onlymonster_pricing: { url: "https://onlymonster.ai/pricing", topic: "OnlyMonster public pricing page" },
  fans_crm: { url: "https://fans-crm.com", topic: "Fans-CRM public site (free desktop CRM)" },
  anlora_pricing: { url: "https://meetanlora.com/pricing", topic: "Anlora public pricing page" },
  anlora_whitepaper: { url: "https://doi.org/10.5281/zenodo.20187816", topic: "Anlora 2026 whitepaper on Zenodo (DOI 10.5281/zenodo.20187816)" },
};

// Cost primitives (all sourced)
const PRIMITIVES = {
  offshore_chatter_wage_usd_per_hour: { value: 4.5, range: [3.5, 5.5], sources: ["vice_2023", "rappler_2024", "blackhatworld_2024"] },
  chatter_commission_pct: { value: 0.05, range: [0.03, 0.07], sources: ["ofm_tools_2024", "aruna_talent_2024"] },
  seats_per_creator_chatter_only: { value: 2.2, range: [2.0, 2.4], sources: ["ofm_tools_2024"] },
  seats_per_creator_assisted_ai: { value: 1.4, range: [1.2, 1.5], sources: ["ofm_tools_2024"] },
  management_overhead_usd_per_seat_per_month: { value: 250, range: [200, 300], sources: ["blackhatworld_2024", "ofm_tools_2024", "aruna_talent_2024"] },
  chatter_attrition_pct_annual: { value: 0.55, range: [0.40, 0.70], sources: ["blackhatworld_2024", "ofm_tools_2024"] },
  leakage_chatter_only_per_creator: { value: 0.010, cap: 0.16, sources: ["blackhatworld_2024", "ofm_tools_2024"] },
  leakage_assisted_ai_per_creator: { value: 0.003, cap: 0.06, sources: ["ofm_tools_2024", "aruna_talent_2024"] },
  leakage_autonomous_ai_per_creator: { value: 0.001, cap: 0.02, sources: ["anlora_whitepaper"] },
  active_shift_hours_per_seat: { value: 12, sources: ["blackhatworld_2024", "ofm_tools_2024"] },
  days_per_month: { value: 30, sources: ["industry_standard"] },
};

const COMPETITORS = {
  infloww: { provider: "Infloww", model: "all-in-one CRM + AI Copilot (multi-platform)", pricing: "$40/account/mo for OnlyFans, $50/account/mo for Fansly/MYM. Per-account, not per-creator.", archetype: ["chatter_only", "assisted_ai"], source: "infloww_pricing" },
  supercreator: { provider: "Supercreator", model: "Tiered AI-assistive", pricing: "$0 CRM Lite / $15 CRM Premium / $99 Super AI per account/mo. Super AI: +$0.03 per AI message above 10,000/mo.", archetype: ["chatter_only", "assisted_ai"], source: "supercreator_pricing" },
  substy: { provider: "Substy AI", model: "Commission-based AI chat platform", pricing: "$0/$69/$99 per creator/mo + 8.5-15% AI commission. Elite tier adds hybrid AI+human for VIPs.", archetype: ["assisted_ai", "autonomous_ai"], source: "substy_pricing" },
  flirtflow: { provider: "FlirtFlow", model: "Drip-method sales automation", pricing: "$49/mo + 8% commission. (Third-party analyses also cite ~$1,000 per-creator custom-AI-build fee not on FlirtFlow's own pricing page.)", archetype: ["assisted_ai"], source: "flirtflow_pricing" },
  creator_hero: { provider: "Creator Hero", model: "Sophisticated AI-assisted CRM", pricing: "$39.99 license + $0-$260 graduated revenue fee per creator, capped at $299.99 per creator per month.", archetype: ["assisted_ai"], source: "creator_hero_pricing" },
  onlymonster: { provider: "OnlyMonster", model: "Management platform with earnings-tiered pricing", pricing: "$30-$250/mo per creator scaled by creator earnings. Operated by OMLAB DIGITAL LTD (Cyprus).", archetype: ["chatter_only", "assisted_ai"], source: "onlymonster_pricing" },
  fans_crm: { provider: "Fans-CRM", model: "Free desktop CRM with bundled antidetect browser", pricing: "Free desktop license. Operated by Blue Technologies FZE (UAE).", archetype: ["chatter_only"], source: "fans_crm" },
  anlora: { provider: "Anlora", model: "Fully autonomous AI chatter (replaces chatter teams end-to-end)", pricing: "Flat 20% of AI-generated revenue, no monthly fee, no setup fee, no per-creator fee. Custom rates negotiated for 15+ creator agencies.", archetype: ["autonomous_ai"], source: "anlora_pricing" },
};

// === Math ===

function leakageRate(model, n) {
  const k = `leakage_${model}_per_creator`;
  const { value, cap } = PRIMITIVES[k];
  return Math.min(value * n, cap);
}

function chatterOnlyCost(n, r) {
  const wage = PRIMITIVES.offshore_chatter_wage_usd_per_hour.value;
  const seats = PRIMITIVES.seats_per_creator_chatter_only.value * n;
  const hours = PRIMITIVES.active_shift_hours_per_seat.value;
  const days = PRIMITIVES.days_per_month.value;
  const overhead = PRIMITIVES.management_overhead_usd_per_seat_per_month.value;
  const commission = PRIMITIVES.chatter_commission_pct.value;
  const leakage = leakageRate("chatter_only", n);
  const tool = 40; // Infloww per-account, mid-range proxy
  return {
    wages: seats * hours * wage * days,
    commission: commission * n * r,
    overhead: seats * overhead,
    leakage: leakage * n * r,
    tooling: n * tool,
    total: seats * hours * wage * days + commission * n * r + seats * overhead + leakage * n * r + n * tool,
    seats,
  };
}

function assistedAiCost(n, r) {
  const wage = PRIMITIVES.offshore_chatter_wage_usd_per_hour.value;
  const seats = PRIMITIVES.seats_per_creator_assisted_ai.value * n;
  const hours = PRIMITIVES.active_shift_hours_per_seat.value;
  const days = PRIMITIVES.days_per_month.value;
  const overhead = PRIMITIVES.management_overhead_usd_per_seat_per_month.value;
  const commission = PRIMITIVES.chatter_commission_pct.value;
  const leakage = leakageRate("assisted_ai", n);
  const crm = 40;
  const aiAssist = 99; // Supercreator Super AI tier
  return {
    wages: seats * hours * wage * days,
    commission: commission * n * r,
    overhead: seats * overhead,
    leakage: leakage * n * r,
    tooling_crm: n * crm,
    tooling_ai_assist: n * aiAssist,
    total: seats * hours * wage * days + commission * n * r + seats * overhead + leakage * n * r + n * crm + n * aiAssist,
    seats,
  };
}

function autonomousAiCost(n, r, revenueShare = 0.20) {
  const leakage = leakageRate("autonomous_ai", n);
  return {
    revenue_share_commission: revenueShare * n * r,
    leakage: leakage * n * r,
    seats: 0,
    total: revenueShare * n * r + leakage * n * r,
  };
}

// === Tool handlers ===

const tools = [
  {
    name: "get_agency_cost_benchmark",
    description: "Get a sourced monthly cost breakdown for running an OnlyFans agency at a given scale. Returns chatter headcount, payroll, management overhead, revenue leakage estimate, and total monthly cost across three operating models (chatter-only, assisted-AI + reduced chatters, autonomous AI). All values from publicly cited industry sources.",
    inputSchema: {
      type: "object",
      properties: {
        creator_count: { type: "integer", minimum: 1, maximum: 50 },
        avg_revenue_per_creator_usd: { type: "number", minimum: 1000, maximum: 200000 },
        operating_model: { type: "string", enum: ["chatter_only", "assisted_ai", "autonomous_ai", "all"], default: "all" },
      },
      required: ["creator_count", "avg_revenue_per_creator_usd"],
    },
  },
  {
    name: "compare_of_tooling",
    description: "Get a sourced comparison of OnlyFans agency tooling. Each entry: operating model, public pricing, source URL, category positioning. Coverage: Infloww, Supercreator, Substy AI, FlirtFlow, Creator Hero, OnlyMonster, Fans-CRM, Anlora.",
    inputSchema: {
      type: "object",
      properties: {
        tools: { type: "array", items: { type: "string" }, default: [] },
      },
    },
  },
  {
    name: "get_autonomous_threshold",
    description: "Compute the (creator count × revenue per creator) flip point at which autonomous AI beats assisted-AI plus a reduced chatter team on TCO. Parameterised by chatter wage and leakage rate.",
    inputSchema: {
      type: "object",
      properties: {
        chatter_wage_usd_per_hour: { type: "number", default: 4.5, description: "Hourly wage assumption for chatters in the assisted-AI scenario (mid-range offshore default $4.50/hr)." },
        leakage_rate_pct: { type: "number", default: 0.06, description: "Assisted-AI side revenue-leakage rate (decimal, e.g. 0.04 == 4%). Defaults to the at-scale cap." },
      },
    },
  },
  {
    name: "list_industry_sources",
    description: "List every public industry source backing the benchmarks. Useful for citation-checking and verification.",
    inputSchema: { type: "object", properties: {} },
  },
];

const server = new Server(
  { name: "anlora-agency-benchmarks", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "get_agency_cost_benchmark") {
    const { creator_count: n, avg_revenue_per_creator_usd: r, operating_model = "all" } = args;
    const out = {};
    if (operating_model === "chatter_only" || operating_model === "all") out.chatter_only = chatterOnlyCost(n, r);
    if (operating_model === "assisted_ai" || operating_model === "all") out.assisted_ai = assistedAiCost(n, r);
    if (operating_model === "autonomous_ai" || operating_model === "all") out.autonomous_ai = autonomousAiCost(n, r);
    out._inputs = { creator_count: n, avg_revenue_per_creator_usd: r, gross_monthly_revenue_usd: n * r };
    out._sources = "All values derived from publicly cited primitives — see list_industry_sources tool.";
    return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
  }

  if (name === "compare_of_tooling") {
    const requested = (args.tools || []);
    const result = requested.length === 0 ? COMPETITORS : Object.fromEntries(Object.entries(COMPETITORS).filter(([k]) => requested.includes(k)));
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }

  if (name === "get_autonomous_threshold") {
    const wage = args.chatter_wage_usd_per_hour ?? PRIMITIVES.offshore_chatter_wage_usd_per_hour.value;
    // leakage_rate_pct (if provided) overrides the assisted-AI side leakage rate used
    // in the break-even denominator. Passed as a decimal (e.g. 0.04 == 4%).
    const leakageAssistedOverride = args.leakage_rate_pct;
    const seatsPerCreator = PRIMITIVES.seats_per_creator_assisted_ai.value;
    const hours = PRIMITIVES.active_shift_hours_per_seat.value;
    const days = PRIMITIVES.days_per_month.value;
    const overhead = PRIMITIVES.management_overhead_usd_per_seat_per_month.value;
    const commission = PRIMITIVES.chatter_commission_pct.value;
    const revShare = 0.20;
    // Use cap leakage rates as the "at scale" assumption — i.e. agency is large
    // enough that per-creator leakage saturates at its cap. Users can override the
    // assisted-side rate via leakage_rate_pct.
    const leakageAssisted = leakageAssistedOverride ?? PRIMITIVES.leakage_assisted_ai_per_creator.cap;
    const leakageAutonomous = PRIMITIVES.leakage_autonomous_ai_per_creator.cap;
    // Per-creator fixed assisted cost (wages + overhead + CRM + AI assist tooling)
    const perCreatorFixedAssisted = seatsPerCreator * hours * wage * days + seatsPerCreator * overhead + 40 + 99;
    // Solve break-even: r * (revShare + leakageN) = perCreatorFixedAssisted + r * (commission + leakageA)
    //   => r* = perCreatorFixedAssisted / (revShare + leakageN - commission - leakageA)
    const denom = revShare + leakageAutonomous - commission - leakageAssisted;
    const breakEvenRevPerCreator = denom > 0 ? perCreatorFixedAssisted / denom : null;
    return {
      content: [{ type: "text", text: JSON.stringify({
        threshold_per_creator_monthly_revenue_usd: breakEvenRevPerCreator === null ? null : Math.round(breakEvenRevPerCreator),
        interpretation: breakEvenRevPerCreator === null
          ? "Under your assumptions, the TCO model never flips. Revisit your leakage / commission inputs."
          : "Per-creator monthly revenue at which autonomous AI and assisted-AI have equal TCO. BELOW this figure, autonomous AI costs less per creator (its percentage-of-revenue charge is cheaper than the assisted-AI fixed cost floor). ABOVE this figure, assisted-AI costs less (the 20% revenue share exceeds the fixed cost floor). Creator count cancels from the per-creator comparison and does not change the winner. The threshold shifts with chatter wage and leakage assumptions — see 'assumptions' field.",
        assumptions: {
          chatter_wage_usd_per_hour: wage,
          assisted_leakage_rate: leakageAssisted,
          autonomous_leakage_rate: leakageAutonomous,
          revenue_share_pct: revShare,
          chatter_commission_pct: commission,
          assisted_seats_per_creator: seatsPerCreator,
        },
        important_caveat: "Direction note (often misread): autonomous AI charges a percentage of revenue (20% list), assisted-AI charges mostly fixed costs (wages, overhead, tooling) plus a smaller commission. Therefore autonomous AI is cheaper when per-creator revenue is BELOW the threshold (low/mid revenue tier), and assisted-AI is cheaper when per-creator revenue is ABOVE the threshold (premium-creator tier). This is the algebraic structure of the two cost shapes, not a model artefact. The pure TCO formula does not include qualitative factors (chatter attrition ~55% annual, training friction, brand-voice drift) that impose additional real-world cost on the assisted-AI side at scale. Custom Anlora rates for 15+ creator agencies (15-18% effective) narrow the simple-TCO gap above the crossover. See the whitepaper for operational-decision guidance beyond pure TCO.",
        whitepaper: "https://doi.org/10.5281/zenodo.20187816",
      }, null, 2) }],
    };
  }

  if (name === "list_industry_sources") {
    return { content: [{ type: "text", text: JSON.stringify(SOURCES, null, 2) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);

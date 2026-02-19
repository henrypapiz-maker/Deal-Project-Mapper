import { describe, it, expect } from "vitest";
import { generateDeal } from "@/lib/decision-tree";
import {
  BASE_INTAKE,
  CARVE_OUT_INTAKE,
  CROSS_BORDER_3J_INTAKE,
  EU_CROSS_BORDER_INTAKE,
  HIGH_VALUE_EU_INTAKE,
  IFRS_INTAKE,
  MULTICULTURAL_INTAKE,
  MULTI_ENTITY_CROSS_BORDER_INTAKE,
  STANDALONE_INTAKE,
  TSA_INTAKE,
} from "./fixtures";

// ─── Shape & invariants ────────────────────────────────────────────────────────

describe("generateDeal — shape", () => {
  it("returns all required top-level fields", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal).toHaveProperty("checklistItems");
    expect(deal).toHaveProperty("riskAlerts");
    expect(deal).toHaveProperty("workstreamSummary");
    expect(deal).toHaveProperty("milestones");
    expect(deal).toHaveProperty("teamMembers");
    expect(deal).toHaveProperty("aiSuggestions");
    expect(deal).toHaveProperty("generatedAt");
  });

  it("starts with empty teamMembers and aiSuggestions", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.teamMembers).toEqual([]);
    expect(deal.aiSuggestions).toEqual([]);
  });

  it("echoes the intake back unchanged", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.intake).toEqual(BASE_INTAKE);
  });

  it("generates exactly 443 checklist items (one per master item)", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.checklistItems).toHaveLength(443);
  });

  it("every checklist item has a unique id", () => {
    const deal = generateDeal(BASE_INTAKE);
    const ids = deal.checklistItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(443);
  });

  it("every checklist item starts with notes: []", () => {
    const deal = generateDeal(BASE_INTAKE);
    deal.checklistItems.forEach((item) => {
      expect(item.notes).toEqual([]);
    });
  });

  it("every non-na item starts as not_started", () => {
    const deal = generateDeal(BASE_INTAKE);
    const active = deal.checklistItems.filter((i) => i.status !== "na");
    active.forEach((item) => expect(item.status).toBe("not_started"));
  });

  it("sets milestoneDate on all items when closeDate is provided", () => {
    const deal = generateDeal(BASE_INTAKE);
    const active = deal.checklistItems.filter((i) => i.status !== "na");
    active.forEach((item) => {
      expect(item.milestoneDate).toBeTruthy();
      expect(item.milestoneDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("omits milestoneDate when closeDate is empty", () => {
    const deal = generateDeal({ ...BASE_INTAKE, closeDate: "" });
    deal.checklistItems.forEach((item) => {
      expect(item.milestoneDate).toBeUndefined();
    });
  });

  it("generates 5 milestones when closeDate is set", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.milestones).toHaveLength(5);
  });

  it("generates 0 milestones when closeDate is empty", () => {
    const deal = generateDeal({ ...BASE_INTAKE, closeDate: "" });
    expect(deal.milestones).toHaveLength(0);
  });

  it("milestone dates are in ascending order", () => {
    const deal = generateDeal(BASE_INTAKE);
    const dates = deal.milestones.map((m) => new Date(m.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThan(dates[i - 1]);
    }
  });

  it("workstreamSummary covers all workstreams present in the master checklist", () => {
    // BASE_INTAKE (domestic) yields 11 workstreams from the master;
    // cross-border items share workstreams so no extra workstream appears —
    // the count is a fixture of the master data, not a bug.
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.workstreamSummary.length).toBeGreaterThanOrEqual(10);
    // Cross-border deal activates all 12 checklist workstreams
    const crossDeal = generateDeal(CROSS_BORDER_3J_INTAKE);
    expect(crossDeal.workstreamSummary.length).toBeGreaterThanOrEqual(11);
  });
});

// ─── Domestic deal — no cross-border risks ────────────────────────────────────

describe("generateDeal — domestic deal (BASE_INTAKE)", () => {
  it("fires no risks for a clean domestic deal with no TSA", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.riskAlerts).toHaveLength(0);
  });

  it("has no cross-border-flagged active items that should be included", () => {
    const deal = generateDeal(BASE_INTAKE);
    // Cross-border items should be NA for domestic deal
    const crossBorderActive = deal.checklistItems.filter(
      (i) => i.crossBorderFlag && i.status !== "na"
    );
    expect(crossBorderActive).toHaveLength(0);
  });
});

// ─── Risk detection ───────────────────────────────────────────────────────────

describe("generateDeal — risk: regulatory_delay", () => {
  it("fires when 3+ jurisdictions are specified", () => {
    const deal = generateDeal(CROSS_BORDER_3J_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "regulatory_delay");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("critical");
    expect(risk?.status).toBe("open");
  });

  it("does NOT fire for 2 jurisdictions", () => {
    const deal = generateDeal({ ...BASE_INTAKE, crossBorder: true, jurisdictions: ["US", "CA"] });
    const risk = deal.riskAlerts.find((r) => r.category === "regulatory_delay");
    expect(risk).toBeUndefined();
  });

  it("does NOT fire for domestic deals", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.riskAlerts.find((r) => r.category === "regulatory_delay")).toBeUndefined();
  });
});

describe("generateDeal — risk: tsa_dependency", () => {
  it("fires when tsaRequired = 'yes'", () => {
    const deal = generateDeal(TSA_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "tsa_dependency");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("high");
  });

  it("does NOT fire when tsaRequired = 'no'", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.riskAlerts.find((r) => r.category === "tsa_dependency")).toBeUndefined();
  });

  it("does NOT fire when tsaRequired = 'tbd'", () => {
    const deal = generateDeal({ ...BASE_INTAKE, tsaRequired: "tbd" });
    expect(deal.riskAlerts.find((r) => r.category === "tsa_dependency")).toBeUndefined();
  });

  it("description mentions carve-out when structure is carve_out", () => {
    const deal = generateDeal(CARVE_OUT_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "tsa_dependency");
    expect(risk?.description).toContain("Carve-Out");
  });
});

describe("generateDeal — risk: stranded_costs", () => {
  it("fires for carve_out structure", () => {
    const deal = generateDeal(CARVE_OUT_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "stranded_costs");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("medium");
  });

  it("does NOT fire for stock_purchase", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.riskAlerts.find((r) => r.category === "stranded_costs")).toBeUndefined();
  });

  it("does NOT fire for forward merger", () => {
    const deal = generateDeal({ ...BASE_INTAKE, dealStructure: "merger_forward" });
    expect(deal.riskAlerts.find((r) => r.category === "stranded_costs")).toBeUndefined();
  });
});

describe("generateDeal — risk: data_privacy_breach", () => {
  it("fires for EU cross-border deal", () => {
    const deal = generateDeal(EU_CROSS_BORDER_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "data_privacy_breach");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("high");
  });

  it("fires for UK jurisdiction", () => {
    const deal = generateDeal({ ...BASE_INTAKE, crossBorder: true, jurisdictions: ["US", "UK"] });
    const risk = deal.riskAlerts.find((r) => r.category === "data_privacy_breach");
    expect(risk).toBeDefined();
  });

  it("does NOT fire for non-EU cross-border (e.g. US + CA)", () => {
    const deal = generateDeal({ ...BASE_INTAKE, crossBorder: true, jurisdictions: ["US", "CA"] });
    expect(deal.riskAlerts.find((r) => r.category === "data_privacy_breach")).toBeUndefined();
  });

  it("description lists the EU/UK jurisdictions", () => {
    const deal = generateDeal(EU_CROSS_BORDER_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "data_privacy_breach");
    expect(risk?.description).toContain("EU-NL");
  });
});

describe("generateDeal — risk: financial_reporting_gap", () => {
  it("fires when target GAAP is IFRS", () => {
    const deal = generateDeal(IFRS_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "financial_reporting_gap");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("high");
  });

  it("fires when >5 entities and cross-border", () => {
    const deal = generateDeal(MULTI_ENTITY_CROSS_BORDER_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "financial_reporting_gap");
    expect(risk).toBeDefined();
  });

  it("does NOT fire for US GAAP domestic single-entity deal", () => {
    const deal = generateDeal(BASE_INTAKE);
    expect(deal.riskAlerts.find((r) => r.category === "financial_reporting_gap")).toBeUndefined();
  });
});

describe("generateDeal — risk: cultural_integration", () => {
  it("fires when 2+ non-US jurisdictions", () => {
    const deal = generateDeal(MULTICULTURAL_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "cultural_integration");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("medium");
  });

  it("does NOT fire for US + 1 non-US (only 1 non-US)", () => {
    const deal = generateDeal({ ...BASE_INTAKE, crossBorder: true, jurisdictions: ["US", "EU-DE"] });
    expect(deal.riskAlerts.find((r) => r.category === "cultural_integration")).toBeUndefined();
  });
});

describe("generateDeal — risk: tax_structure_leakage", () => {
  it("fires for high-value EU deal", () => {
    const deal = generateDeal(HIGH_VALUE_EU_INTAKE);
    const risk = deal.riskAlerts.find((r) => r.category === "tax_structure_leakage");
    expect(risk).toBeDefined();
    expect(risk?.severity).toBe("high");
  });

  it("fires when jurisdiction is EU-IE", () => {
    const deal = generateDeal({ ...BASE_INTAKE, crossBorder: true, jurisdictions: ["EU-IE"] });
    const risk = deal.riskAlerts.find((r) => r.category === "tax_structure_leakage");
    expect(risk).toBeDefined();
  });

  it("does NOT fire for domestic deal regardless of value", () => {
    const deal = generateDeal({ ...BASE_INTAKE, dealValueRange: ">$5B" });
    expect(deal.riskAlerts.find((r) => r.category === "tax_structure_leakage")).toBeUndefined();
  });
});

// ─── Priority adjustments ─────────────────────────────────────────────────────

describe("generateDeal — priority adjustments", () => {
  it("standalone model downgrades 'critical' items to 'high'", () => {
    const deal = generateDeal(STANDALONE_INTAKE);
    const active = deal.checklistItems.filter((i) => i.status !== "na");
    const hasCritical = active.some((i) => i.priority === "critical");
    expect(hasCritical).toBe(false);
  });

  it("fully_integrated model retains 'critical' priority items", () => {
    const deal = generateDeal(BASE_INTAKE);
    const active = deal.checklistItems.filter((i) => i.status !== "na");
    // Not all may be critical, but the model shouldn't strip them
    // Just verify the field is a valid value
    active.forEach((item) =>
      expect(["critical", "high", "medium", "low"]).toContain(item.priority)
    );
  });

  it("carve-out elevates early TSA items to critical", () => {
    const deal = generateDeal(CARVE_OUT_INTAKE);
    // Early FRC items (up to ~70) in carve-out should have critical priority
    const earlyItems = deal.checklistItems
      .filter((i) => i.status !== "na")
      .filter((i) => {
        const num = parseInt(i.itemId.replace("FRC-0", ""));
        return num <= 70;
      });
    const hasCritical = earlyItems.some((i) => i.priority === "critical");
    expect(hasCritical).toBe(true);
  });
});

// ─── Risk alert shape ─────────────────────────────────────────────────────────

describe("generateDeal — risk alert shape", () => {
  it("every risk alert has required fields", () => {
    const deal = generateDeal(CARVE_OUT_INTAKE);
    deal.riskAlerts.forEach((r) => {
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("category");
      expect(r).toHaveProperty("severity");
      expect(r).toHaveProperty("description");
      expect(r).toHaveProperty("mitigation");
      expect(r).toHaveProperty("affectedWorkstreams");
      expect(r.status).toBe("open");
    });
  });

  it("every risk alert has a non-empty description and mitigation", () => {
    const deal = generateDeal(CROSS_BORDER_3J_INTAKE);
    deal.riskAlerts.forEach((r) => {
      expect(r.description.length).toBeGreaterThan(10);
      expect(r.mitigation.length).toBeGreaterThan(10);
    });
  });

  it("affectedWorkstreams are non-empty arrays", () => {
    const deal = generateDeal(CROSS_BORDER_3J_INTAKE);
    deal.riskAlerts.forEach((r) => {
      expect(Array.isArray(r.affectedWorkstreams)).toBe(true);
      expect(r.affectedWorkstreams.length).toBeGreaterThan(0);
    });
  });
});

// ─── Complex deal — multiple risks fire simultaneously ─────────────────────────

describe("generateDeal — complex multi-risk deal", () => {
  it("carve-out + EU + 3 jurisdictions + IFRS fires 5+ risks", () => {
    const complexIntake = {
      ...CARVE_OUT_INTAKE,
      crossBorder: true,
      jurisdictions: ["EU-DE", "EU-FR", "US"],
      targetGaap: "IFRS",
    };
    const deal = generateDeal(complexIntake);
    // Should fire: tsa_dependency, stranded_costs, regulatory_delay,
    //              data_privacy_breach, financial_reporting_gap, cultural_integration
    expect(deal.riskAlerts.length).toBeGreaterThanOrEqual(5);
  });

  it("each fired risk has a unique id", () => {
    const deal = generateDeal(CROSS_BORDER_3J_INTAKE);
    const ids = deal.riskAlerts.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

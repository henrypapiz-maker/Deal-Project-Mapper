import { describe, it, expect } from "vitest";
import { getKpis, getWorkstreamStats, getWorkstreamRag, getDealRag } from "@/lib/decision-tree";
import { makeItem } from "./fixtures";

// ─── getKpis ─────────────────────────────────────────────────────────────────

describe("getKpis", () => {
  it("returns all zeros for an empty list", () => {
    const kpis = getKpis([]);
    expect(kpis).toEqual({ total: 0, complete: 0, inProgress: 0, blocked: 0, notStarted: 0, pctComplete: 0 });
  });

  it("excludes 'na' items from all counts", () => {
    const items = [
      makeItem({ id: "1", status: "na" }),
      makeItem({ id: "2", status: "not_started" }),
    ];
    const kpis = getKpis(items);
    expect(kpis.total).toBe(1);
    expect(kpis.notStarted).toBe(1);
  });

  it("counts each status bucket correctly", () => {
    const items = [
      makeItem({ id: "1", status: "complete" }),
      makeItem({ id: "2", status: "complete" }),
      makeItem({ id: "3", status: "in_progress" }),
      makeItem({ id: "4", status: "blocked" }),
      makeItem({ id: "5", status: "not_started" }),
      makeItem({ id: "6", status: "na" }),
    ];
    const kpis = getKpis(items);
    expect(kpis.total).toBe(5);
    expect(kpis.complete).toBe(2);
    expect(kpis.inProgress).toBe(1);
    expect(kpis.blocked).toBe(1);
    expect(kpis.notStarted).toBe(1);
  });

  it("calculates pctComplete as rounded integer", () => {
    const items = [
      makeItem({ id: "1", status: "complete" }),
      makeItem({ id: "2", status: "complete" }),
      makeItem({ id: "3", status: "not_started" }),
    ];
    const kpis = getKpis(items);
    expect(kpis.pctComplete).toBe(67); // 2/3 = 66.67 → rounds to 67
  });

  it("returns 0% when nothing is complete", () => {
    const items = [makeItem({ id: "1", status: "not_started" })];
    expect(getKpis(items).pctComplete).toBe(0);
  });

  it("returns 100% when all active items are complete", () => {
    const items = [
      makeItem({ id: "1", status: "complete" }),
      makeItem({ id: "2", status: "complete" }),
      makeItem({ id: "3", status: "na" }),
    ];
    expect(getKpis(items).pctComplete).toBe(100);
  });
});

// ─── getWorkstreamStats ───────────────────────────────────────────────────────

describe("getWorkstreamStats", () => {
  it("returns an empty map for no items", () => {
    expect(getWorkstreamStats([]).size).toBe(0);
  });

  it("skips 'na' items", () => {
    const items = [makeItem({ id: "1", status: "na", workstream: "Treasury & Banking" })];
    expect(getWorkstreamStats(items).size).toBe(0);
  });

  it("aggregates multiple workstreams independently", () => {
    const items = [
      makeItem({ id: "1", workstream: "Treasury & Banking", status: "complete" }),
      makeItem({ id: "2", workstream: "Treasury & Banking", status: "blocked" }),
      makeItem({ id: "3", workstream: "Income Tax & Compliance", status: "in_progress" }),
    ];
    const stats = getWorkstreamStats(items);
    expect(stats.get("Treasury & Banking")).toMatchObject({ total: 2, complete: 1, blocked: 1 });
    expect(stats.get("Income Tax & Compliance")).toMatchObject({ total: 1, inProgress: 1 });
  });

  it("counts notStarted correctly", () => {
    const items = [
      makeItem({ id: "1", workstream: "HR & Workforce Integration", status: "not_started" }),
      makeItem({ id: "2", workstream: "HR & Workforce Integration", status: "not_started" }),
    ];
    const stats = getWorkstreamStats(items);
    expect(stats.get("HR & Workforce Integration")?.notStarted).toBe(2);
  });
});

// ─── getWorkstreamRag ─────────────────────────────────────────────────────────

describe("getWorkstreamRag", () => {
  const base = { complete: 0, inProgress: 0, blocked: 0, notStarted: 0, total: 0 };

  it("returns 'red' when any item is blocked", () => {
    expect(getWorkstreamRag({ ...base, blocked: 1, total: 10, complete: 8 })).toBe("red");
  });

  it("returns 'green' when >=80% complete and nothing blocked", () => {
    expect(getWorkstreamRag({ ...base, complete: 8, total: 10 })).toBe("green");
    expect(getWorkstreamRag({ ...base, complete: 10, total: 10 })).toBe("green");
  });

  it("returns 'amber' when <80% complete and nothing blocked", () => {
    expect(getWorkstreamRag({ ...base, complete: 7, total: 10 })).toBe("amber");
    expect(getWorkstreamRag({ ...base, complete: 0, total: 5 })).toBe("amber");
  });

  it("returns 'amber' for empty workstream (0/0 → 0%, not >=80%)", () => {
    // pct = 0/0 = 0, which is < 0.8 threshold → amber
    expect(getWorkstreamRag({ ...base, total: 0 })).toBe("amber");
  });

  it("blocked takes priority over high completion", () => {
    expect(getWorkstreamRag({ ...base, complete: 9, blocked: 1, total: 10 })).toBe("red");
  });
});

// ─── getDealRag ───────────────────────────────────────────────────────────────

describe("getDealRag", () => {
  it("returns 'red' when blocked items exist", () => {
    expect(getDealRag({ blocked: 1, pctComplete: 90 }, [])).toBe("red");
  });

  it("returns 'red' when a critical open risk exists", () => {
    const risks = [{ severity: "critical", status: "open" }];
    expect(getDealRag({ blocked: 0, pctComplete: 90 }, risks)).toBe("red");
  });

  it("does not return 'red' for critical mitigated risk", () => {
    const risks = [{ severity: "critical", status: "mitigated" }];
    expect(getDealRag({ blocked: 0, pctComplete: 90 }, risks)).toBe("green");
  });

  it("returns 'green' when >=80% complete and no blockers/critical-open risks", () => {
    expect(getDealRag({ blocked: 0, pctComplete: 80 }, [])).toBe("green");
    expect(getDealRag({ blocked: 0, pctComplete: 100 }, [])).toBe("green");
  });

  it("returns 'amber' otherwise", () => {
    expect(getDealRag({ blocked: 0, pctComplete: 50 }, [])).toBe("amber");
    expect(getDealRag({ blocked: 0, pctComplete: 79 }, [{ severity: "high", status: "open" }])).toBe("amber");
  });
});

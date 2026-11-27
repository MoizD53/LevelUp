"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTablePricing, saveAllTablePricing } from "@/lib/turso/service";
import type { TableKind } from "@/lib/types";

interface PricingRowState {
  rate_30m: number;
  rate_60m: number;
  slot1_mins: number;
  slot2_mins: number;
}

const CATEGORY_CONFIG: {
  categoryKey: string;
  name: string;
  countLabel: string;
  badge?: string;
  description: string;
}[] = [
  // 1. Royal Tables (3 Categories)
  {
    categoryKey: "Royal",
    name: "Royal — Standard",
    countLabel: "2 Tables",
    badge: "VIP Standard",
    description: "VIP private cuesport tables — standard match & frame tariffs",
  },
  {
    categoryKey: "Royal_RD",
    name: "Royal — RD",
    countLabel: "2 Tables",
    badge: "VIP RD",
    description: "Royal table Red Ball game format tariffs",
  },
  {
    categoryKey: "Royal_Shuffle",
    name: "Royal — Shuffle",
    countLabel: "2 Tables",
    badge: "VIP Safal",
    description: "Royal table Shuffle (Safal) format tariffs",
  },

  // 2. Snooker Tables (3 Categories)
  {
    categoryKey: "Snooker",
    name: "Snooker — Standard",
    countLabel: "2 Tables",
    badge: "Standard",
    description: "Standard Snooker match & frame tariffs",
  },
  {
    categoryKey: "Snooker_RD",
    name: "Snooker — RD",
    countLabel: "2 Tables",
    badge: "RD",
    description: "Red Ball / Standard Snooker frame tariffs",
  },
  {
    categoryKey: "Snooker_Shuffle",
    name: "Snooker — Shuffle",
    countLabel: "2 Tables",
    badge: "Safal",
    description: "Shuffle (Safal) Snooker game format with custom match scoring",
  },

  // 3. Pool Table (Khali pool chodke — 1 Category)
  {
    categoryKey: "Pool",
    name: "Pool Table",
    countLabel: "1 Table",
    badge: "9ft (Single)",
    description: "Classic American 8-ball and 9-ball pool table (Khali pool chodke)",
  },
];

export default function TablePricingSettingsPage() {
  const { user, isOwner } = useAuth();

  // Pricing state across all categories (Royal 3, Snooker 3, Pool 1)
  const [rates, setRates] = useState<Record<string, PricingRowState>>({
    Royal: { rate_30m: 300, rate_60m: 500, slot1_mins: 30, slot2_mins: 60 },
    Royal_RD: { rate_30m: 300, rate_60m: 500, slot1_mins: 30, slot2_mins: 60 },
    Royal_Shuffle: { rate_30m: 350, rate_60m: 600, slot1_mins: 30, slot2_mins: 60 },
    Snooker: { rate_30m: 200, rate_60m: 350, slot1_mins: 30, slot2_mins: 60 },
    Snooker_RD: { rate_30m: 200, rate_60m: 350, slot1_mins: 30, slot2_mins: 60 },
    Snooker_Shuffle: { rate_30m: 250, rate_60m: 400, slot1_mins: 30, slot2_mins: 60 },
    Pool: { rate_30m: 150, rate_60m: 250, slot1_mins: 30, slot2_mins: 60 },
  });

  const [initialRates, setInitialRates] = useState<Record<string, PricingRowState>>({
    Royal: { rate_30m: 300, rate_60m: 500, slot1_mins: 30, slot2_mins: 60 },
    Royal_RD: { rate_30m: 300, rate_60m: 500, slot1_mins: 30, slot2_mins: 60 },
    Royal_Shuffle: { rate_30m: 350, rate_60m: 600, slot1_mins: 30, slot2_mins: 60 },
    Snooker: { rate_30m: 200, rate_60m: 350, slot1_mins: 30, slot2_mins: 60 },
    Snooker_RD: { rate_30m: 200, rate_60m: 350, slot1_mins: 30, slot2_mins: 60 },
    Snooker_Shuffle: { rate_30m: 250, rate_60m: 400, slot1_mins: 30, slot2_mins: 60 },
    Pool: { rate_30m: 150, rate_60m: 250, slot1_mins: 30, slot2_mins: 60 },
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Load persisted rates from database
  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const pricingList = await getTablePricing();
      const loaded: Record<string, PricingRowState> = {
        Royal: { rate_30m: 300, rate_60m: 500, slot1_mins: 30, slot2_mins: 60 },
        Royal_RD: { rate_30m: 300, rate_60m: 500, slot1_mins: 30, slot2_mins: 60 },
        Royal_Shuffle: { rate_30m: 350, rate_60m: 600, slot1_mins: 30, slot2_mins: 60 },
        Snooker: { rate_30m: 200, rate_60m: 350, slot1_mins: 30, slot2_mins: 60 },
        Snooker_RD: { rate_30m: 200, rate_60m: 350, slot1_mins: 30, slot2_mins: 60 },
        Snooker_Shuffle: { rate_30m: 250, rate_60m: 400, slot1_mins: 30, slot2_mins: 60 },
        Pool: { rate_30m: 150, rate_60m: 250, slot1_mins: 30, slot2_mins: 60 },
      };

      pricingList.forEach((p) => {
        if (loaded[p.category]) {
          loaded[p.category] = {
            rate_30m: p.rate_30m,
            rate_60m: p.rate_60m,
            slot1_mins: p.slot1_mins || 30,
            slot2_mins: p.slot2_mins || 60,
          };
        }
      });

      // Fallback for Royal variants if not yet individually populated
      const royalBase = loaded.Royal;
      if (!pricingList.some((p) => p.category === "Royal_RD")) {
        loaded.Royal_RD = { rate_30m: royalBase.rate_30m, rate_60m: royalBase.rate_60m, slot1_mins: royalBase.slot1_mins, slot2_mins: royalBase.slot2_mins };
      }
      if (!pricingList.some((p) => p.category === "Royal_Shuffle")) {
        loaded.Royal_Shuffle = { rate_30m: Math.round(royalBase.rate_30m * 1.15), rate_60m: Math.round(royalBase.rate_60m * 1.2), slot1_mins: royalBase.slot1_mins, slot2_mins: royalBase.slot2_mins };
      }

      // Fallback for Snooker variants
      const snookerBase = loaded.Snooker;
      if (!pricingList.some((p) => p.category === "Snooker_RD")) {
        loaded.Snooker_RD = { rate_30m: snookerBase.rate_30m, rate_60m: snookerBase.rate_60m, slot1_mins: snookerBase.slot1_mins, slot2_mins: snookerBase.slot2_mins };
      }
      if (!pricingList.some((p) => p.category === "Snooker_Shuffle")) {
        loaded.Snooker_Shuffle = { rate_30m: Math.round(snookerBase.rate_30m * 1.25), rate_60m: Math.round(snookerBase.rate_60m * 1.15), slot1_mins: snookerBase.slot1_mins, slot2_mins: snookerBase.slot2_mins };
      }

      setRates(loaded);
      setInitialRates(loaded);
      setIsDirty(false);
    } catch (err) {
      console.error("Failed to load table pricing:", err);
      setFeedback({
        type: "error",
        message: "Failed to load current prices from database.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  // Unsaved changes warning before leaving window
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handlePriceChange = (
    category: string,
    field: "rate_30m" | "rate_60m" | "slot1_mins" | "slot2_mins",
    val: string
  ) => {
    const cleanNum = val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0);

    setRates((prev) => {
      const next = {
        ...prev,
        [category]: {
          ...(prev[category] || { rate_30m: 0, rate_60m: 0, slot1_mins: 30, slot2_mins: 60 }),
          [field]: cleanNum,
        },
      };

      // Check if dirty compared to initial
      const hasChanges = Object.keys(next).some((cat) => {
        return (
          next[cat]?.rate_30m !== initialRates[cat]?.rate_30m ||
          next[cat]?.rate_60m !== initialRates[cat]?.rate_60m ||
          next[cat]?.slot1_mins !== initialRates[cat]?.slot1_mins ||
          next[cat]?.slot2_mins !== initialRates[cat]?.slot2_mins
        );
      });
      setIsDirty(hasChanges);

      return next;
    });

    if (feedback) setFeedback(null);
  };

  const handleSavePrices = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    // Validate prices and slot durations
    for (const item of CATEGORY_CONFIG) {
      const row = rates[item.categoryKey] || { rate_30m: 0, rate_60m: 0, slot1_mins: 30, slot2_mins: 60 };
      if (row.rate_30m < 0 || row.rate_60m < 0 || isNaN(row.rate_30m) || isNaN(row.rate_60m)) {
        setFeedback({
          type: "error",
          message: `Please enter valid non-negative amounts for ${item.name}.`,
        });
        setIsSaving(false);
        return;
      }
      if (!row.slot1_mins || row.slot1_mins <= 0 || !row.slot2_mins || row.slot2_mins <= 0) {
        setFeedback({
          type: "error",
          message: `Please enter valid slot durations (greater than 0 mins) for ${item.name}.`,
        });
        setIsSaving(false);
        return;
      }
    }

    const payload = CATEGORY_CONFIG.map((c) => ({
      category: c.categoryKey,
      rate_30m: rates[c.categoryKey]?.rate_30m || 0,
      rate_60m: rates[c.categoryKey]?.rate_60m || 0,
      slot1_mins: rates[c.categoryKey]?.slot1_mins || 30,
      slot2_mins: rates[c.categoryKey]?.slot2_mins || 60,
    }));

    // Also update legacy 'Snooker' category to match Snooker_RD
    if (rates["Snooker_RD"]) {
      payload.push({
        category: "Snooker",
        rate_30m: rates["Snooker_RD"].rate_30m,
        rate_60m: rates["Snooker_RD"].rate_60m,
        slot1_mins: rates["Snooker_RD"].slot1_mins || 30,
        slot2_mins: rates["Snooker_RD"].slot2_mins || 60,
      });
    }

    const result = await saveAllTablePricing(
      payload,
      user?.username || (isOwner ? "owner" : "manager"),
      user?.role || (isOwner ? "owner" : "staff")
    );

    if (result.success) {
      setInitialRates(rates);
      setIsDirty(false);
      setFeedback({
        type: "success",
        message: "Table prices saved successfully and updated live on the floor.",
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.type === "success" ? null : prev));
      }, 4000);
    } else {
      setFeedback({
        type: "error",
        message: result.error || "Failed to save table prices.",
      });
    }

    setIsSaving(false);
  };

  return (
    <>
      {/* Header */}
      <div className="page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            Table Pricing
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Set standard rates for each table category.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isDirty && (
            <span
              style={{
                fontSize: 12,
                color: "var(--amber)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              Unsaved changes
            </span>
          )}

          <button
            onClick={() => handleSavePrices()}
            disabled={isSaving || loading}
            className="btn btn-primary"
            style={{
              height: 36,
              padding: "0 18px",
              fontSize: 13,
              fontWeight: 700,
              gap: 8,
              minWidth: 125,
            }}
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} style={{ animation: "spin 0.6s linear infinite" }} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Prices</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            background:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`,
            color: feedback.type === "success" ? "var(--accent-primary)" : "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Clean Table & Game Pricing Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {CATEGORY_CONFIG.map(({ categoryKey, name, countLabel, badge, description }) => {
          const row = rates[categoryKey] || { rate_30m: 0, rate_60m: 0, slot1_mins: 30, slot2_mins: 60 };

          return (
            <div
              key={categoryKey}
              className="glass-card"
              style={{
                padding: 20,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-md)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Card Title */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {name}
                    </h3>
                    {badge && (
                      <span
                        className="badge"
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          background: categoryKey.includes("RD") ? "rgba(16, 185, 129, 0.15)" : categoryKey.includes("Shuffle") ? "rgba(59, 130, 246, 0.15)" : undefined,
                          color: categoryKey.includes("RD") ? "var(--accent-primary)" : categoryKey.includes("Shuffle") ? "#60A5FA" : undefined,
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {description}
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 500, flexShrink: 0 }}>
                  {countLabel}
                </span>
              </div>

              {/* Slot 1: Duration & Price */}
              <div
                style={{
                  background: "var(--bg-surface-inset)",
                  padding: 12,
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Slot 1 (Standard / Short)
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {row.slot1_mins || 30} mins
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={row.slot1_mins || ""}
                      onChange={(e) => handlePriceChange(categoryKey, "slot1_mins", e.target.value)}
                      placeholder="30"
                      style={{
                        width: "100%",
                        height: 38,
                        padding: "0 10px",
                        background: "var(--bg-surface-raised)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--r-xs)",
                        color: "var(--text-primary)",
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Price (₹)
                    </label>
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={row.rate_30m || ""}
                        onChange={(e) => handlePriceChange(categoryKey, "rate_30m", e.target.value)}
                        placeholder="0"
                        style={{
                          width: "100%",
                          height: 38,
                          paddingLeft: 24,
                          paddingRight: 10,
                          background: "var(--bg-surface-raised)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--r-xs)",
                          color: "var(--accent-primary)",
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Slot 2: Duration & Price */}
              <div
                style={{
                  background: "var(--bg-surface-inset)",
                  padding: 12,
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Slot 2 (Full / Extended)
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {row.slot2_mins || 60} mins
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={row.slot2_mins || ""}
                      onChange={(e) => handlePriceChange(categoryKey, "slot2_mins", e.target.value)}
                      placeholder="60"
                      style={{
                        width: "100%",
                        height: 38,
                        padding: "0 10px",
                        background: "var(--bg-surface-raised)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--r-xs)",
                        color: "var(--text-primary)",
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                      Price (₹)
                    </label>
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={row.rate_60m || ""}
                        onChange={(e) => handlePriceChange(categoryKey, "rate_60m", e.target.value)}
                        placeholder="0"
                        style={{
                          width: "100%",
                          height: 38,
                          paddingLeft: 24,
                          paddingRight: 10,
                          background: "var(--bg-surface-raised)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--r-xs)",
                          color: "#60A5FA",
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

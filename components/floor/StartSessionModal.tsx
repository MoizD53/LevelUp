"use client";

import { useState, useEffect } from "react";
import type { ClubTable, TablePricing, TableKind } from "@/lib/types";
import { startFloorSession, getTablePricing } from "@/lib/turso/service";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Play,
  X,
  User,
  Phone,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";

interface StartSessionModalProps {
  table: ClubTable | null;
  pricingList?: TablePricing[];
  initialGameType?: "RD" | "Shuffle";
  onClose: () => void;
  onSessionStarted: () => void;
}

export function StartSessionModal({
  table,
  pricingList = [],
  initialGameType,
  onClose,
  onSessionStarted,
}: StartSessionModalProps) {
  const { user } = useAuth();
  const [playerName, setPlayerName] = useState("");
  const [phone, setPhone] = useState("");
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [durationChoice, setDurationChoice] = useState<"30m" | "1h">("30m");
  const [gameType, setGameType] = useState<"RD" | "Shuffle">(initialGameType || "RD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initialGameType if passed or changes
  useEffect(() => {
    if (initialGameType) {
      setGameType(initialGameType);
    } else {
      setGameType("RD");
    }
  }, [initialGameType, table?.id]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [livePricing, setLivePricing] = useState<TablePricing[]>(pricingList);

  useEffect(() => {
    if (pricingList && pricingList.length > 0) {
      setLivePricing(pricingList);
    } else {
      getTablePricing().then((data) => {
        if (data && data.length > 0) setLivePricing(data);
      });
    }
  }, [pricingList]);

  if (!table) return null;

  const isSnooker = table.kind === "Snooker";

  // Snooker specific pricing for RD and Shuffle
  const snookerRDRates = livePricing.find((p) => p.category === "Snooker_RD") || livePricing.find((p) => p.category === "Snooker") || {
    rate_30m: 200,
    rate_60m: 350,
  };

  const snookerShuffleRates = livePricing.find((p) => p.category === "Snooker_Shuffle") || {
    rate_30m: Math.round(snookerRDRates.rate_30m * 1.25),
    rate_60m: Math.round(snookerRDRates.rate_60m * 1.15),
  };

  // Active pricing for this match
  const pricing = isSnooker
    ? (gameType === "RD" ? snookerRDRates : snookerShuffleRates)
    : (livePricing.find((p) => p.category === table.kind) || {
        rate_30m: table.kind === "Royal" ? 300 : 150,
        rate_60m: table.kind === "Royal" ? 500 : 250,
      });

  const currentPrice = durationChoice === "30m" ? pricing.rate_30m : pricing.rate_60m;

  const handleStartMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg("Please enter the primary player / customer name.");
      return;
    }

    if (phone.trim() && !/^[0-9+\s-]{7,15}$/.test(phone.trim())) {
      setErrorMsg("Please enter a valid phone number or leave it blank.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await startFloorSession({
      tableId: table.id,
      tableName: table.name,
      tableKind: table.kind,
      gameType: isSnooker ? gameType : undefined,
      playerName: playerName.trim(),
      phone: phone.trim() || undefined,
      durationChoice,
      rateSnapshot: currentPrice,
      managerName: user?.username || "manager",
    });

    if (res.success) {
      if (typeof window !== "undefined" && res.sessionId) {
        window.dispatchEvent(
          new CustomEvent("levelup_local_session_started", {
            detail: { sessionId: res.sessionId },
          })
        );
      }
      onSessionStarted();
      onClose();
    } else {
      setErrorMsg(res.error || "Failed to start match.");
    }
    setIsSubmitting(false);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card modal-sheet"
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          background: "var(--bg-surface-raised)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--r-md)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="eyebrow eyebrow-accent">New Arena Match</span>
              <span className="badge" style={{ fontSize: 10, padding: "2px 6px" }}>
                {table.kind}
              </span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
              {table.name}
            </h2>
          </div>
          <button onClick={onClose} style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: "var(--r-xs)",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "var(--danger)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleStartMatch} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Step A: Player Details */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              Primary Customer / Player Name <span style={{ color: "var(--accent-primary)" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <User size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                required
                autoFocus
                placeholder="e.g. Rahul Sharma"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  paddingLeft: 32,
                  paddingRight: 10,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Phone Number (Optional)
              </label>
              <div style={{ position: "relative" }}>
                <Phone size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="tel"
                  placeholder="e.g. 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    paddingLeft: 32,
                    paddingRight: 10,
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                Players
              </label>
              <div
                style={{
                  display: "flex",
                  height: 38,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  padding: "2px",
                  gap: 2,
                }}
              >
                {[1, 2, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPlayerCount(count)}
                    style={{
                      all: "unset",
                      flex: 1,
                      textAlign: "center",
                      borderRadius: "var(--r-xs)",
                      fontSize: 12,
                      fontWeight: playerCount === count ? 700 : 500,
                      color: playerCount === count ? "var(--text-primary)" : "var(--text-muted)",
                      background: playerCount === count ? "var(--bg-surface-raised)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    {count}P
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Snooker Game Mode Option (RD or Shuffle) */}
          {isSnooker && (
            <div style={{ background: "var(--bg-surface-inset)", padding: 12, borderRadius: "var(--r-sm)", border: "1px solid var(--border-default)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Select Snooker Game <span style={{ color: "var(--accent-primary)" }}>*</span>
                </label>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Different pricing applies</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* 1. RD Option */}
                <button
                  type="button"
                  onClick={() => setGameType("RD")}
                  style={{
                    all: "unset",
                    padding: "12px 14px",
                    borderRadius: "var(--r-xs)",
                    background: gameType === "RD" ? "rgba(16, 185, 129, 0.14)" : "var(--bg-surface)",
                    border: gameType === "RD" ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text-primary)" }}>1. RD</span>
                      <span className="badge" style={{ fontSize: 9.5, padding: "1px 5px", background: "rgba(16, 185, 129, 0.2)", color: "var(--accent-primary)" }}>Standard</span>
                    </div>
                    {gameType === "RD" && <CheckCircle2 size={16} color="var(--accent-primary)" />}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    ₹{snookerRDRates.rate_30m}/30m · ₹{snookerRDRates.rate_60m}/1h
                  </div>
                </button>

                {/* 2. Shuffle Option */}
                <button
                  type="button"
                  onClick={() => setGameType("Shuffle")}
                  style={{
                    all: "unset",
                    padding: "12px 14px",
                    borderRadius: "var(--r-xs)",
                    background: gameType === "Shuffle" ? "rgba(59, 130, 246, 0.14)" : "var(--bg-surface)",
                    border: gameType === "Shuffle" ? "2px solid #60A5FA" : "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text-primary)" }}>2. Shuffle</span>
                      <span className="badge" style={{ fontSize: 9.5, padding: "1px 5px", background: "rgba(59, 130, 246, 0.2)", color: "#60A5FA" }}>Custom</span>
                    </div>
                    {gameType === "Shuffle" && <CheckCircle2 size={16} color="#60A5FA" />}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    ₹{snookerShuffleRates.rate_30m}/30m · ₹{snookerShuffleRates.rate_60m}/1h
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step B: Select Duration (Large Visual Selectors) */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
              Select Initial Match Duration
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* 30 Minutes Option */}
              <button
                type="button"
                onClick={() => setDurationChoice("30m")}
                style={{
                  all: "unset",
                  padding: "14px 16px",
                  borderRadius: "var(--r-sm)",
                  background: durationChoice === "30m" ? "rgba(0, 199, 138, 0.12)" : "var(--bg-surface-inset)",
                  border: durationChoice === "30m" ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                    {table.kind === "Pool" ? "2 Minutes" : "30 Minutes"}
                  </span>
                  {durationChoice === "30m" && <CheckCircle2 size={16} color="var(--accent-primary)" />}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{pricing.rate_30m}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                  {table.kind === "Pool" ? "2 mins quick session" : "Quick match tariff"}
                </div>
              </button>

              {/* 1 Hour Option */}
              <button
                type="button"
                onClick={() => setDurationChoice("1h")}
                style={{
                  all: "unset",
                  padding: "14px 16px",
                  borderRadius: "var(--r-sm)",
                  background: durationChoice === "1h" ? "rgba(0, 199, 138, 0.12)" : "var(--bg-surface-inset)",
                  border: durationChoice === "1h" ? "2px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>1 Hour (60m)</span>
                  {durationChoice === "1h" && <CheckCircle2 size={16} color="var(--accent-primary)" />}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{pricing.rate_60m}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                  Full frame tariff
                </div>
              </button>
            </div>
          </div>

          {/* Booking Summary Box */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--r-xs)",
              background: "var(--bg-surface-inset)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12.5,
            }}
          >
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                {isSnooker ? `Snooker (${gameType}) Tariff:` : "Starting Fee:"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                ₹{currentPrice} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>({isSnooker ? `${gameType} · ` : ""}{durationChoice === "30m" ? (table.kind === "Pool" ? "2 mins" : "30 mins") : "1 hour"})</span>
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>
              <span>Manager: {user?.username || "manager"}</span>
              <div>Rate locked into session ledger</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ flex: 1, height: 40 }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                flex: 1.5,
                height: 40,
                fontSize: 13,
                fontWeight: 700,
                gap: 6,
                background: "linear-gradient(180deg, #00C78A 0%, #009E6D 100%)",
              }}
            >
              <Play size={14} fill="currentColor" />
              <span>{isSubmitting ? "Locking Table..." : "Confirm & Start Match"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

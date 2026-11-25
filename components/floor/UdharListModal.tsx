"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Phone,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  User,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getUdharDebtors, settleCustomerUdhar } from "@/lib/turso/service";
import type { UdharDebtor } from "@/lib/types";

interface UdharListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettled?: () => void;
}

export function UdharListModal({ isOpen, onClose, onSettled }: UdharListModalProps) {
  const { user } = useAuth();
  const [debtors, setDebtors] = useState<UdharDebtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Settle single debtor modal state
  const [settlingDebtor, setSettlingDebtor] = useState<UdharDebtor | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleMethod, setSettleMethod] = useState<"cash" | "upi">("cash");
  const [settleUpiRef, setSettleUpiRef] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadDebtors = async () => {
    setLoading(true);
    try {
      const data = await getUdharDebtors();
      setDebtors(data);
    } catch (err) {
      console.error("Failed to load udhar debtors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDebtors();
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !settlingDebtor) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, settlingDebtor, onClose]);

  const totalPendingUdhar = useMemo(() => {
    return debtors.reduce((sum, d) => sum + d.totalUdhar, 0);
  }, [debtors]);

  const filteredDebtors = useMemo(() => {
    if (!search.trim()) return debtors;
    const q = search.toLowerCase().trim();
    return debtors.filter((d) => {
      return (
        d.customerName.toLowerCase().includes(q) ||
        (d.customerPhone && d.customerPhone.includes(q))
      );
    });
  }, [debtors, search]);

  const handleOpenSettle = (d: UdharDebtor) => {
    setSettlingDebtor(d);
    setSettleAmount(String(d.totalUdhar));
    setSettleMethod("cash");
    setSettleUpiRef("");
    setFeedback(null);
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingDebtor) return;

    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid payment amount greater than ₹0." });
      return;
    }
    if (amt > settlingDebtor.totalUdhar) {
      setFeedback({ type: "error", message: `Amount cannot exceed outstanding balance of ₹${settlingDebtor.totalUdhar}.` });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await settleCustomerUdhar({
      customerName: settlingDebtor.customerName,
      customerPhone: settlingDebtor.customerPhone,
      amountCollected: amt,
      paymentMethod: settleMethod,
      upiReference: settleMethod === "upi" ? settleUpiRef.trim() : undefined,
      managerName: user?.username || "manager",
    });

    if (res.success) {
      setSettlingDebtor(null);
      await loadDebtors();
      if (onSettled) onSettled();
      setFeedback({ type: "success", message: `Successfully settled ₹${amt} from ${settlingDebtor.customerName}!` });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to settle payment." });
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div
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
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 680,
          maxHeight: "calc(100dvh - 40px)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface-raised)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--r-md)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.8)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-surface-inset)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="eyebrow" style={{ color: "var(--amber)", fontSize: 11 }}>
                Khata &amp; Credit Ledger
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(245, 158, 11, 0.16)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "var(--amber)",
                }}
              >
                {debtors.length} Debtors
              </span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginTop: 2 }}>
              Outstanding Udhar List
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Bakii</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                ₹{totalPendingUdhar.toLocaleString("en-IN")}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            style={{
              padding: "10px 18px",
              background: feedback.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              borderBottom: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              color: feedback.type === "success" ? "var(--accent-primary)" : "var(--danger)",
              fontSize: 12.5,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {feedback.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
            />
            <input
              placeholder="Search by customer name or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                paddingLeft: 30,
                paddingRight: 10,
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 12.5,
              }}
            />
          </div>
        </div>

        {/* Debtors List Table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Loading Udhar records...
            </div>
          ) : filteredDebtors.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              <CheckCircle2 size={32} style={{ color: "var(--accent-primary)", margin: "0 auto 8px" }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>No Outstanding Udhar</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>All player bills and counter sales are currently settled!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredDebtors.map((d, idx) => (
                <div
                  key={`${d.customerName}_${idx}`}
                  style={{
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    background: "transparent",
                    transition: "background 0.15s ease",
                  }}
                  className="table-row-hover"
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }}>
                        {d.customerName}
                      </span>
                      <span className="badge" style={{ fontSize: 10, padding: "1px 6px" }}>
                        {d.sessionCount} match{d.sessionCount > 1 ? "es" : ""}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 11.5, color: "var(--text-muted)" }}>
                      {d.customerPhone ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                          <Phone size={11} />
                          {d.customerPhone}
                        </span>
                      ) : (
                        <span>No phone recorded</span>
                      )}
                      <span>·</span>
                      <span>Last: {new Date(d.lastDate).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                    </div>

                    {/* Breakdown of sessions */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {d.sessions.map((s) => (
                        <span
                          key={s.sessionId}
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: "var(--r-xs)",
                            background: "var(--bg-surface-inset)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {s.tableKind === "Cafe" ? "Counter / Cigg & Chips" : s.table} {s.gameType ? `(${s.gameType})` : ""}: ₹{s.udharAmount}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                        ₹{d.totalUdhar}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", fontWeight: 700 }}>
                        Bakii Udhar
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenSettle(d)}
                      className="btn btn-primary"
                      style={{
                        height: 28,
                        fontSize: 11,
                        padding: "0 10px",
                        fontWeight: 700,
                        gap: 4,
                        background: "linear-gradient(180deg, #00C78A 0%, #009E6D 100%)",
                      }}
                    >
                      <DollarSign size={12} />
                      <span>Settle Udhar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-surface-inset)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11.5,
            color: "var(--text-muted)",
          }}
        >
          <span>Visible to both Owner and Manager · Realtime sync</span>
          <button onClick={onClose} className="btn" style={{ height: 30, fontSize: 12 }}>
            Close
          </button>
        </div>
      </div>

      {/* Settle Udhar Dialog */}
      {settlingDebtor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setSettlingDebtor(null)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              padding: 20,
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <span className="eyebrow" style={{ color: "var(--accent-primary)" }}>Collect Payment</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Settle {settlingDebtor.customerName}&apos;s Udhar
                </h3>
              </div>
              <button
                onClick={() => setSettlingDebtor(null)}
                style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--r-xs)",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                marginBottom: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Total Outstanding:</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                ₹{settlingDebtor.totalUdhar}
              </span>
            </div>

            <form onSubmit={handleConfirmSettle} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Amount Collecting (₹)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={settlingDebtor.totalUdhar}
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Payment Method
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSettleMethod("cash")}
                    style={{
                      all: "unset",
                      padding: "8px 10px",
                      borderRadius: "var(--r-xs)",
                      border: settleMethod === "cash" ? "2px solid var(--accent-primary)" : "1px solid var(--border-default)",
                      background: settleMethod === "cash" ? "rgba(0, 199, 138, 0.12)" : "var(--bg-surface-inset)",
                      textAlign: "center",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      color: settleMethod === "cash" ? "var(--accent-primary)" : "var(--text-secondary)",
                    }}
                  >
                    💵 Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleMethod("upi")}
                    style={{
                      all: "unset",
                      padding: "8px 10px",
                      borderRadius: "var(--r-xs)",
                      border: settleMethod === "upi" ? "2px solid #60A5FA" : "1px solid var(--border-default)",
                      background: settleMethod === "upi" ? "rgba(59, 130, 246, 0.12)" : "var(--bg-surface-inset)",
                      textAlign: "center",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 700,
                      color: settleMethod === "upi" ? "#60A5FA" : "var(--text-secondary)",
                    }}
                  >
                    📱 UPI / QR
                  </button>
                </div>
              </div>

              {settleMethod === "upi" && (
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    UPI Reference (Optional)
                  </label>
                  <input
                    placeholder="e.g. UTR 429184..."
                    value={settleUpiRef}
                    onChange={(e) => setSettleUpiRef(e.target.value)}
                    style={{
                      width: "100%",
                      height: 34,
                      padding: "0 10px",
                      background: "var(--bg-surface-inset)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--r-xs)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                    }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setSettlingDebtor(null)}
                  className="btn"
                  style={{ flex: 1, height: 38 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{
                    flex: 1.5,
                    height: 38,
                    fontWeight: 700,
                    background: "linear-gradient(180deg, #00C78A 0%, #009E6D 100%)",
                  }}
                >
                  {isSubmitting ? "Settling..." : `Collect ₹${settleAmount || 0}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

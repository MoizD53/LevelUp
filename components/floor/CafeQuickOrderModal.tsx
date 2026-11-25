"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Flame,
  Utensils,
  Package,
  User,
  Phone,
  DollarSign,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createCafeQuickOrder } from "@/lib/turso/service";

interface CafeItem {
  id: string;
  name: string;
  category: "Drinks" | "Snacks" | "Cigarettes" | "Other";
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CafeQuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

export function CafeQuickOrderModal({ isOpen, onClose, onOrderCreated }: CafeQuickOrderModalProps) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");

  // Items in current order
  const [items, setItems] = useState<CafeItem[]>([]);

  // Item being added
  const [itemCategory, setItemCategory] = useState<"Drinks" | "Snacks" | "Cigarettes" | "Other">("Drinks");
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<string>("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "udhar">("cash");
  const [upiRef, setUpiRef] = useState("");
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = itemName.trim();
    if (!nameTrimmed) {
      setErrorMsg("Please enter an item name (e.g. Red Bull, Gold Flake, Doritos).");
      return;
    }
    const qty = Number(itemQty) || 1;
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      setErrorMsg("Please enter a valid price.");
      return;
    }

    const newItem: CafeItem = {
      id: `it_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: nameTrimmed,
      category: itemCategory,
      quantity: qty,
      unitPrice: price,
      totalPrice: qty * price,
    };

    setItems((prev) => [...prev, newItem]);
    setItemName("");
    setItemPrice("");
    setItemQty(1);
    setErrorMsg(null);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const itemsTotal = items.reduce((sum, it) => sum + it.totalPrice, 0);
  const discountVal = Math.max(0, parseFloat(discountAmount) || 0);
  const finalTotal = Math.max(0, itemsTotal - discountVal);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg("Please add at least one item (Drink, Cigarette, or Chips) to the bill.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await createCafeQuickOrder({
      customerName: customerName.trim() || "Walk-in Counter Customer",
      customerPhone: phone.trim() || undefined,
      items: items.map((it) => ({
        name: it.name,
        category: it.category,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      paymentMethod,
      cashPaid: paymentMethod === "cash" ? finalTotal : 0,
      upiPaid: paymentMethod === "upi" ? finalTotal : 0,
      udharAmount: paymentMethod === "udhar" ? finalTotal : 0,
      upiReference: paymentMethod === "upi" ? upiRef.trim() : undefined,
      discountAmount: discountVal,
      notes: notes.trim() || undefined,
      managerName: user?.username || "manager",
    });

    if (res.success) {
      onOrderCreated();
      onClose();
    } else {
      setErrorMsg(res.error || "Failed to record sale.");
    }
    setIsSubmitting(false);
  };

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
          maxWidth: 520,
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          background: "var(--bg-surface-raised)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--r-md)",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.8)",
          padding: 22,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="eyebrow" style={{ color: "var(--accent-primary)" }}>Counter POS</span>
              <span className="badge" style={{ fontSize: 10, padding: "2px 6px" }}>Drinks · Cigg · Chips</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
              Quick Sale (No Table)
            </h2>
          </div>
          <button onClick={onClose} style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              marginBottom: 14,
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

        {/* Customer Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
              Customer / Player Name
            </label>
            <div style={{ position: "relative" }}>
              <User size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                placeholder="e.g. Walk-in / Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  paddingLeft: 30,
                  paddingRight: 8,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 12.5,
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
              Phone Number
            </label>
            <div style={{ position: "relative" }}>
              <Phone size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                placeholder="Optional / Mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: "100%",
                  height: 36,
                  paddingLeft: 30,
                  paddingRight: 8,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 12.5,
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Category Picker */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
            Select Category to Add
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[
              { key: "Drinks" as const, label: "Drinks", icon: Coffee },
              { key: "Cigarettes" as const, label: "Cigarettes", icon: Flame },
              { key: "Snacks" as const, label: "Chips/Snacks", icon: Utensils },
              { key: "Other" as const, label: "Other", icon: Package },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setItemCategory(key)}
                style={{
                  all: "unset",
                  padding: "8px 6px",
                  borderRadius: "var(--r-xs)",
                  border: itemCategory === key ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                  background: itemCategory === key ? "rgba(0, 199, 138, 0.12)" : "var(--bg-surface-inset)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  textAlign: "center",
                }}
              >
                <Icon size={14} color={itemCategory === key ? "var(--accent-primary)" : "var(--text-muted)"} />
                <span style={{ fontSize: 11, fontWeight: itemCategory === key ? 700 : 500, color: itemCategory === key ? "var(--accent-primary)" : "var(--text-secondary)" }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Add Item Dynamic Inputs */}
        <div
          style={{
            background: "var(--bg-surface-inset)",
            padding: 12,
            borderRadius: "var(--r-xs)",
            border: "1px solid var(--border-subtle)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.8fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                Item Name
              </label>
              <input
                placeholder={
                  itemCategory === "Drinks"
                    ? "e.g. Red Bull, Coke..."
                    : itemCategory === "Cigarettes"
                    ? "e.g. Classic Mild, Gold Flake..."
                    : "e.g. Lays Blue, Kurkure..."
                }
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                style={{
                  width: "100%",
                  height: 34,
                  padding: "0 8px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 12.5,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                Qty
              </label>
              <input
                type="number"
                min="1"
                value={itemQty}
                onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: "100%",
                  height: 34,
                  padding: "0 8px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 12.5,
                  textAlign: "center",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                Price (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="₹ 0"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                style={{
                  width: "100%",
                  height: 34,
                  padding: "0 8px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="btn btn-primary"
              style={{ height: 34, padding: "0 12px", gap: 4, fontSize: 12, fontWeight: 700 }}
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Current Items List */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
            <span>Order Items ({items.length})</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-primary)" }}>₹{itemsTotal}</span>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: "16px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
              No items added yet. Choose category and enter price above.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 130, overflowY: "auto" }}>
              {items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: "var(--r-xs)",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{it.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                      ({it.quantity} × ₹{it.unitPrice})
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                      ₹{it.totalPrice}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      style={{ all: "unset", cursor: "pointer", color: "var(--danger)", padding: 2 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bill Breakdown & Payment Mode */}
        <div
          style={{
            background: "var(--bg-surface-inset)",
            padding: 12,
            borderRadius: "var(--r-xs)",
            border: "1px solid var(--border-subtle)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Total Amount:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
              ₹{finalTotal}
            </span>
          </div>

          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
            Payment Mode
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              style={{
                all: "unset",
                padding: "8px 0",
                borderRadius: "var(--r-xs)",
                border: paymentMethod === "cash" ? "2px solid var(--accent-primary)" : "1px solid var(--border-default)",
                background: paymentMethod === "cash" ? "rgba(0, 199, 138, 0.14)" : "var(--bg-surface)",
                textAlign: "center",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: paymentMethod === "cash" ? "var(--accent-primary)" : "var(--text-secondary)",
              }}
            >
              💵 Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("upi")}
              style={{
                all: "unset",
                padding: "8px 0",
                borderRadius: "var(--r-xs)",
                border: paymentMethod === "upi" ? "2px solid #60A5FA" : "1px solid var(--border-default)",
                background: paymentMethod === "upi" ? "rgba(59, 130, 246, 0.14)" : "var(--bg-surface)",
                textAlign: "center",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: paymentMethod === "upi" ? "#60A5FA" : "var(--text-secondary)",
              }}
            >
              📱 UPI / QR
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("udhar")}
              style={{
                all: "unset",
                padding: "8px 0",
                borderRadius: "var(--r-xs)",
                border: paymentMethod === "udhar" ? "2px solid var(--amber)" : "1px solid var(--border-default)",
                background: paymentMethod === "udhar" ? "rgba(245, 158, 11, 0.14)" : "var(--bg-surface)",
                textAlign: "center",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: paymentMethod === "udhar" ? "var(--amber)" : "var(--text-secondary)",
              }}
            >
              ⚠️ Udhar (Khata)
            </button>
          </div>

          {paymentMethod === "udhar" && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 10px",
                borderRadius: "var(--r-xs)",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "var(--amber)",
                fontSize: 11.5,
              }}
            >
              ⚠️ Will record ₹{finalTotal} as pending Udhar under {customerName || "Walk-in"}.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} className="btn" style={{ flex: 1, height: 40 }}>
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || items.length === 0}
            onClick={handleSubmitOrder}
            className="btn btn-primary"
            style={{
              flex: 1.6,
              height: 40,
              fontWeight: 700,
              fontSize: 13,
              background: paymentMethod === "udhar"
                ? "linear-gradient(180deg, #F59E0B 0%, #D97706 100%)"
                : "linear-gradient(180deg, #00C78A 0%, #009E6D 100%)",
              color: paymentMethod === "udhar" ? "#000" : undefined,
            }}
          >
            <CheckCircle2 size={16} />
            <span>
              {isSubmitting
                ? "Recording..."
                : paymentMethod === "udhar"
                ? `Confirm ₹${finalTotal} as Udhar`
                : `Collect ₹${finalTotal} & Record Sale`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

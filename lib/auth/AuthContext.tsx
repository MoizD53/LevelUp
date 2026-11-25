"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { UserRole } from "@/lib/types";

export interface AuthUser {
  username: string;
  role: UserRole;
  title: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => ({ success: false }),
  logout: () => {},
  isOwner: false,
});

const AUTH_STORAGE_KEY = "levelup_terminal_auth_session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.role === "owner" || parsed.role === "staff")) {
          setUser(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (usernameInput: string, passwordInput: string) => {
    const username = (usernameInput || "").trim().toLowerCase();
    const password = (passwordInput || "").trim();

    // Check Manager Credentials (ID: Manager, Pass: 123@Manager)
    if (
      (username === "manager" || username === "staff") &&
      (password === "123@Manager" || password === "123@manager" || password === "manager@123")
    ) {
      const sessionUser: AuthUser = {
        username: "Manager",
        role: "staff",
        title: "Manager",
      };
      setUser(sessionUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
      return { success: true };
    }

    // Check Owner Credentials (ID: Owner, Pass: Owner@123)
    if (
      username === "owner" &&
      (password === "Owner@123" || password === "owner@123")
    ) {
      const sessionUser: AuthUser = {
        username: "Owner",
        role: "owner",
        title: "Owner",
      };
      setUser(sessionUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
      return { success: true };
    }

    return {
      success: false,
      error: "Invalid credentials. Please verify your username and password.",
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const isOwner = user?.role === "owner";
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        isOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

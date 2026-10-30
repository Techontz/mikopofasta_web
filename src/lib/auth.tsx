"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";

import { api } from "@/lib/api";

/** Role key of the Credit Officer: their own dashboard and the red Credit Department theme. */
export const CREDIT_OFFICER = "credit_officer";

/** Roles that see the HRM section (enhancement §14), by the role the session currently acts as. */
export const HRM_ROLES = ["hr", "admin", "super_admin"];

export interface AssignedRole {
  id: number;
  key: string;
  name: string;
  primary: boolean;
}

export interface CurrentUser {
  id: number;
  full_name: string;
  phone: string;
  photo_url: string;
  company: { id: number; name: string; logo: string | null };
  branch: { id: number; name: string } | null;
  zone: { id: number; name: string } | null;
  /** The role this session acts as (Switch Role). */
  role: { id: number; key: string; name: string; scope: "company" | "zone" | "branch" } | null;
  /** Every role the employee may switch to; the primary one first. */
  roles?: AssignedRole[];
  permissions: string[];
  branch_ids: number[] | null;
  /** "staff" or "shareholder" (a Shareholder Portal login). */
  account_type?: "staff" | "shareholder";
  /** A temporary password must be changed before anything else. */
  must_change_password?: boolean;
  /** The shareholder record linked to this login (portal access), if any. */
  shareholder?: { id: number; name: string } | null;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isLoading: boolean;
  can: (permission: string | string[]) => boolean;
  logout: () => Promise<void>;
  /** Act as another assigned role without signing out; the backend revalidates it on every request. */
  switchRole: (roleId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<{ data: CurrentUser }>("auth/me").then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });

  const user = data ?? null;

  const can = (permission: string | string[]) => {
    if (!user) {
      return false;
    }
    const required = Array.isArray(permission) ? permission : [permission];
    return required.some((item) => user.permissions.includes(item));
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const switchRole = async (roleId: number) => {
    const response = await api.post<{ data: CurrentUser }>("auth/switch-role", { role_id: roleId });
    // Everything cached was loaded under the previous role: drop it and start again from that role's dashboard.
    client.clear();
    client.setQueryData(["auth", "me"], response.data);
    window.location.href = "/dashboard";
  };

  return <AuthContext.Provider value={{ user, isLoading, can, logout, switchRole }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

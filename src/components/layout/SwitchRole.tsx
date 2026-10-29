"use client";

import { useState } from "react";

import { toastError } from "@/components/customers/toast";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Switch Role (enhancement §13), beside Log Out: only for an employee assigned more than one role. Shows the role the
 * session acts as; choosing another reloads the dashboard, menus, reports and data scope of that role.
 */
export function SwitchRole() {
  const { user, switchRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const roles = user?.roles ?? [];

  if (roles.length < 2 || !user?.role) {
    return null;
  }

  const choose = async (roleId: number) => {
    setOpen(false);
    if (roleId === user.role?.id) {
      return;
    }
    setBusy(true);
    try {
      await switchRole(roleId);
    } catch (error) {
      setBusy(false);
      toastError(error instanceof ApiError ? error.firstError : "The role could not be switched.");
    }
  };

  return (
    <div className={`dropdown mf-switch-role ${open ? "show" : ""}`}>
      <button type="button" className="btn btn-sm btn-outline-primary dropdown-toggle" disabled={busy} onClick={() => setOpen(!open)} title="Switch role" aria-haspopup="listbox" aria-expanded={open}>
        <i className="icon-shuffle" /> {user.role.name}
      </button>
      <ul className={`dropdown-menu dropdown-menu-right ${open ? "show" : ""}`} role="listbox">
        <li className="dropdown-header">Switch role</li>
        {roles.map((role) => (
          <li key={role.id}>
            <a href="#" role="option" className={`dropdown-item ${role.id === user.role?.id ? "active" : ""}`} aria-selected={role.id === user.role?.id} onClick={(event) => { event.preventDefault(); void choose(role.id); }}>
              {role.name}{role.primary ? " (primary)" : ""}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

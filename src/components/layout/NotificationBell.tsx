"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";

interface NotificationItem {
  id: string;
  kind: string | null;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string | null;
}

interface NotificationFeed {
  unread_count: number;
  items: NotificationItem[];
}

const FEED_KEY = ["notifications"];
const POLL_MS = 30_000;

/** "5 min ago" style age of a notification. */
function age(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : new Date(iso).toLocaleDateString();
}

/**
 * Header bell: the signed-in employee's notifications (customer registrations awaiting KYC approval, customer updates,
 * branch transfers and their decisions). Checks for new ones every 30 seconds; opening one marks it read.
 */
export function NotificationBell() {
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLLIElement>(null);
  const { data } = useQuery({
    queryKey: FEED_KEY,
    queryFn: () => api.get<{ data: NotificationFeed }>("notifications").then((response) => response.data),
    refetchInterval: POLL_MS,
  });
  const unread = data?.unread_count ?? 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const refresh = () => client.invalidateQueries({ queryKey: FEED_KEY });

  const openItem = async (item: NotificationItem) => {
    setOpen(false);
    if (!item.read_at) {
      await api.post(`notifications/${item.id}/read`, {}).catch(() => undefined);
      void refresh();
    }
    if (item.link) {
      router.push(item.link);
    }
  };

  const readAll = async () => {
    await api.post("notifications/read-all", {}).catch(() => undefined);
    void refresh();
  };

  return (
    <li ref={wrapper} className={`dropdown mf-notifications ${open ? "show" : ""}`}>
      <a
        href="#"
        className="icon-menu"
        title={unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          setOpen(!open);
          if (!open) {
            void refresh();
          }
        }}
      >
        <i className="icon-bell" />
        {unread > 0 && <span className="mf-icon-badge">{unread > 99 ? "99+" : unread}</span>}
      </a>
      <div className={`dropdown-menu dropdown-menu-right mf-notifications-menu ${open ? "show" : ""}`}>
        <div className="mf-notifications-head">
          <b>Notifications</b>
          {unread > 0 && (
            <button type="button" className="btn btn-link btn-sm p-0" onClick={() => void readAll()}>
              Mark all as read
            </button>
          )}
        </div>
        {(data?.items.length ?? 0) === 0 && <p className="mf-notifications-empty">No notifications yet.</p>}
        <ul className="list-unstyled mb-0">
          {data?.items.map((item) => (
            <li key={item.id}>
              <button type="button" className={`mf-notification ${item.read_at ? "" : "unread"}`} onClick={() => void openItem(item)}>
                <span className="mf-notification-title">{item.title}</span>
                <span className="mf-notification-message">{item.message}</span>
                <small className="text-muted">{age(item.created_at)}</small>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

/** Chat icon with the number of unread messages (checked every 30 seconds). */
export function MessagesIcon() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["messages/unread"],
    queryFn: () => api.get<{ data: { count: number } }>("messages/unread").then((response) => response.data.count),
    refetchInterval: POLL_MS,
  });
  const unread = data ?? 0;

  return (
    <a
      href="/messages"
      className="icon-menu d-none d-sm-block"
      title={unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Messages"}
      onClick={(event) => {
        event.preventDefault();
        router.push("/messages");
      }}
    >
      <i className="icon-bubbles" />
      {unread > 0 && <span className="mf-icon-badge">{unread > 99 ? "99+" : unread}</span>}
    </a>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { toastInfo } from "@/components/customers/toast";
import { armAlertSound, playAlertSound } from "@/lib/alertSound";
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

interface UnreadMessages {
  count: number;
  latest: { id: number; conversation_id: number; from: string; preview: string; sent_at: string | null } | null;
}

const FEED_KEY = ["notifications"];
/** Under ["messages"] so the Messages page refreshes the header count as soon as a conversation is read. */
export const UNREAD_MESSAGES_KEY = ["messages", "unread"];
const POLL_MS = 30_000;
const MESSAGES_POLL_MS = 15_000;
const PULSE_MS = 3_500;

/**
 * Remembers the newest item already seen and reports whether a newer one just arrived (never on the first load, so
 * opening the app does not chime for old items).
 */
function useArrival(newest: string | number | null | undefined, ready: boolean): boolean {
  const seen = useRef<string | number | null | undefined>(undefined);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    armAlertSound();
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const first = seen.current === undefined;
    const isNew = !first && newest !== null && newest !== undefined && (seen.current === null || newest > (seen.current as typeof newest));
    seen.current = newest ?? seen.current ?? null;
    if (!isNew) {
      return;
    }
    playAlertSound();
    const start = setTimeout(() => setPulse(true), 0);
    const stop = setTimeout(() => setPulse(false), PULSE_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [newest, ready]);

  return pulse;
}

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
  const newestUnread = data?.items.find((item) => !item.read_at)?.created_at ?? null;
  const pulse = useArrival(newestUnread, data !== undefined);

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
        {unread > 0 && <span className={`mf-icon-badge ${pulse ? "mf-badge-pulse" : ""}`}>{unread > 99 ? "99+" : unread}</span>}
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

/**
 * Chat icon with the number of unread messages, checked every 15 seconds and whenever the window regains focus. A new
 * message turns the badge red, makes it pulse, plays a short chime, shows who wrote it and adds the count to the tab
 * title. Reading the conversation on the Messages page clears the badge at once.
 */
export function MessagesIcon() {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: UNREAD_MESSAGES_KEY,
    queryFn: () => api.get<{ data: UnreadMessages }>("messages/unread").then((response) => response.data),
    refetchInterval: MESSAGES_POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const unread = data?.count ?? 0;
  const latest = data?.latest ?? null;
  const pulse = useArrival(latest?.id ?? null, data !== undefined);

  useEffect(() => {
    if (pulse && latest && !pathname.startsWith("/messages")) {
      toastInfo(`New message from ${latest.from}: ${latest.preview}`);
    }
  }, [pulse, latest, pathname]);

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\) /, "");
    document.title = unread > 0 ? `(${unread > 99 ? "99+" : unread}) ${base}` : base;
  }, [unread, pathname]);

  return (
    <a
      href="/messages"
      className="icon-menu d-none d-sm-block"
      title={unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}${latest ? ` - latest from ${latest.from}` : ""}` : "Messages"}
      onClick={(event) => {
        event.preventDefault();
        router.push("/messages");
      }}
    >
      <i className="icon-bubbles" />
      {unread > 0 && <span className={`mf-icon-badge mf-badge-alert ${pulse ? "mf-badge-pulse" : ""}`}>{unread > 99 ? "99+" : unread}</span>}
    </a>
  );
}

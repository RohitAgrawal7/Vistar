"use client";

import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import type { AuditEvent } from "@/lib/types";

const ACTION_LABEL: Record<AuditEvent["action"], string> = {
  staff_login: "Sign-in",
  staff_logout: "Sign-out",
  session_closed: "Done",
  session_abandoned: "Force clear",
  session_resumed: "Resume device",
  session_exited: "Guest exit",
  order_cancelled: "Order deleted",
  order_restored: "Order undone",
};

export function AuditLog({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No audit events yet"
        body="Staff sign-in, Done, Force clear, and resume-on-new-device are recorded here."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[28px] border border-espresso/8 bg-white">
      <table className="min-w-full text-left text-sm">
        <caption className="sr-only">Staff audit log</caption>
        <thead className="border-b border-espresso/8 text-xs uppercase tracking-wider text-espresso/50">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Staff</th>
            <th className="px-4 py-3 font-medium">Table</th>
            <th className="px-4 py-3 font-medium">Note</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-espresso/5 last:border-0 align-top">
              <td className="whitespace-nowrap px-4 py-3 text-espresso/70">
                {formatDateTime(event.at)}
              </td>
              <td className="px-4 py-3 font-medium">{ACTION_LABEL[event.action]}</td>
              <td className="px-4 py-3">{event.staffName}</td>
              <td className="px-4 py-3">{event.tableId ?? "—"}</td>
              <td className="px-4 py-3 text-espresso/80">
                {event.guestName ? `${event.guestName}: ` : ""}
                {event.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

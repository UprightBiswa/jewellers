import type { Metadata } from "next";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MessageRow } from "@/components/admin/message-row";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await db.contactMessage.findMany({
    select: {
      id: true, name: true, email: true, phone: true, subject: true,
      message: true, status: true, orderRef: true, createdAt: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 50,
  });

  const unread = messages.filter((m) => m.status === "NEW").length;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Messages</h1>
        <p className="text-sm text-muted">
          {unread > 0
            ? `${unread} waiting for a reply. Tap a message to open it.`
            : "Everything here has been dealt with."}
        </p>
      </header>

      {messages.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center text-sm text-muted">
          No messages yet. The contact form on your website sends them here.
        </p>
      ) : (
        <ul className="grid gap-3">
          {messages.map((m) => (
            <MessageRow
              key={m.id}
              message={{
                ...m,
                createdAtLabel: formatDate(m.createdAt, true),
              }}
            />
          ))}
        </ul>
      )}

      <p className="text-[13px] text-muted">
        Showing the 50 most recent. Replies go from your own email — tap the address to open
        your mail app.
      </p>

      <noscript>
        <Badge tone="warn">Marking as read needs JavaScript</Badge>
      </noscript>
    </div>
  );
}

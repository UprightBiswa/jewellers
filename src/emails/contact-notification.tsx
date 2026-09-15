import { Section, Text } from "@react-email/components";
import { KeyValue, Shell, styles } from "./components";

/** Goes to the shop owner, not the customer. */
export default function ContactNotificationEmail({
  name = "",
  email = "",
  phone,
  subject,
  message = "",
  orderRef,
  receivedAt = "",
}: {
  name?: string;
  email?: string;
  phone?: string | null;
  subject?: string | null;
  message?: string;
  orderRef?: string | null;
  receivedAt?: string;
}) {
  return (
    <Shell preview={`New message from ${name}`}>
      <Text style={styles.heading}>New message from your website</Text>

      <Section
        style={{
          backgroundColor: "#f5f6f8",
          borderRadius: "8px",
          margin: "16px 0",
          padding: "16px",
        }}
      >
        <KeyValue label="Name" value={name} />
        <KeyValue label="Email" value={email} />
        {phone ? <KeyValue label="Phone" value={phone} /> : null}
        {orderRef ? <KeyValue label="Order" value={orderRef} /> : null}
        {subject ? <KeyValue label="Subject" value={subject} /> : null}
        <KeyValue label="Received" value={receivedAt} />
      </Section>

      <Text style={{ ...styles.label, margin: "0 0 6px" }}>MESSAGE</Text>
      <Text style={{ ...styles.text, whiteSpace: "pre-line" }}>{message}</Text>

      <Text style={styles.muted}>
        Reply to this email and it goes straight back to the customer.
      </Text>
    </Shell>
  );
}

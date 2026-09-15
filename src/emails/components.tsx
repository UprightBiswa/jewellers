import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

/**
 * Shared shell for every transactional email.
 *
 * Email clients are 2003 HTML: inline styles, tables, no custom fonts, no CSS
 * variables. So this file deliberately repeats literal hex values rather than
 * reaching for the app's design tokens.
 */

const STORE = process.env.NEXT_PUBLIC_SITE_NAME ?? "Silver Store";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const styles = {
  body: {
    backgroundColor: "#f5f6f8",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e1e5ea",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "32px",
  },
  brand: {
    color: "#7e2b3a",
    fontSize: "20px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    margin: "0 0 4px",
  },
  heading: {
    color: "#14171a",
    fontSize: "22px",
    fontWeight: 600,
    margin: "20px 0 8px",
  },
  text: {
    color: "#3c434c",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 14px",
  },
  muted: {
    color: "#6a717b",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 8px",
  },
  button: {
    backgroundColor: "#7e2b3a",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 24px",
    textDecoration: "none",
  },
  hr: { borderColor: "#e1e5ea", margin: "24px 0" },
  row: { padding: "6px 0" },
  label: { color: "#6a717b", fontSize: "13px" },
  value: { color: "#14171a", fontSize: "15px", fontWeight: 600 },
} as const;

export function Shell({
  preview,
  children,
}: {
  preview: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>{STORE}</Text>
          <Text style={styles.muted}>Handcrafted 925 sterling silver</Text>
          <Hr style={styles.hr} />
          {children}
          <Hr style={styles.hr} />
          <Section>
            <Text style={styles.muted}>
              Questions? Just reply to this email and we will get back to you.
            </Text>
            <Text style={styles.muted}>
              {STORE} · <a href={SITE} style={{ color: "#7e2b3a" }}>{SITE.replace(/^https?:\/\//, "")}</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <Section style={styles.row}>
      <Text style={{ ...styles.label, margin: 0 }}>{label}</Text>
      <Text style={{ ...styles.value, margin: 0 }}>{value}</Text>
    </Section>
  );
}

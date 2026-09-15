import { Section, Text } from "@react-email/components";
import { Shell, styles } from "./components";

export default function WelcomeEmail({
  name = "there",
  shopUrl = "https://example.com",
  couponCode,
}: {
  name?: string;
  shopUrl?: string;
  couponCode?: string;
}) {
  return (
    <Shell preview="Welcome — your account is ready">
      <Text style={styles.heading}>Welcome, {name}</Text>
      <Text style={styles.text}>
        Your account is ready. You can now track orders, save addresses and check out faster.
      </Text>

      {couponCode ? (
        <Section
          style={{
            backgroundColor: "#f6e9eb",
            border: "1px dashed #7e2b3a",
            borderRadius: "8px",
            margin: "20px 0",
            padding: "16px",
            textAlign: "center" as const,
          }}
        >
          <Text style={{ ...styles.muted, margin: "0 0 4px" }}>
            Use this on your first order
          </Text>
          <Text
            style={{
              color: "#7e2b3a",
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: 0,
            }}
          >
            {couponCode}
          </Text>
        </Section>
      ) : null}

      <Section style={{ margin: "24px 0" }}>
        <a href={shopUrl} style={styles.button}>
          Start shopping
        </a>
      </Section>

      <Text style={styles.muted}>
        Every piece is hallmarked 925 sterling or 999 fine silver, made by hand.
      </Text>
    </Shell>
  );
}

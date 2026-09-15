import { Section, Text } from "@react-email/components";
import { Shell, styles } from "./components";

export default function PasswordResetEmail({
  name = "there",
  resetUrl = "https://example.com/reset-password?token=demo",
  expiresInMinutes = 60,
}: {
  name?: string;
  resetUrl?: string;
  expiresInMinutes?: number;
}) {
  return (
    <Shell preview="Reset your password">
      <Text style={styles.heading}>Reset your password</Text>
      <Text style={styles.text}>
        Hello {name}, we received a request to reset the password on your account.
      </Text>

      <Section style={{ margin: "24px 0" }}>
        <a href={resetUrl} style={styles.button}>
          Choose a new password
        </a>
      </Section>

      <Text style={styles.muted}>
        This link works once and expires in {expiresInMinutes} minutes.
      </Text>
      <Text style={styles.muted}>
        If you did not ask for this, you can ignore this email — your password stays as it is.
      </Text>
    </Shell>
  );
}

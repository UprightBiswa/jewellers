import { Section, Text } from "@react-email/components";
import { KeyValue, Shell, styles } from "./components";

export default function OrderShippedEmail({
  name = "there",
  orderNumber = "SS-260915-0001",
  courier = "Delhivery",
  awb = "",
  trackingUrl = "",
  deliveryEstimate = "4–7 working days",
}: {
  name?: string;
  orderNumber?: string;
  courier?: string;
  awb?: string;
  trackingUrl?: string;
  deliveryEstimate?: string;
}) {
  return (
    <Shell preview={`Order ${orderNumber} is on its way`}>
      <Text style={styles.heading}>Your order is on its way</Text>
      <Text style={styles.text}>
        {name}, order {orderNumber} left our workshop today.
      </Text>

      <Section
        style={{
          backgroundColor: "#f5f6f8",
          borderRadius: "8px",
          margin: "20px 0",
          padding: "16px",
        }}
      >
        <KeyValue label="Courier" value={courier} />
        {awb ? <KeyValue label="Tracking number" value={awb} /> : null}
        <KeyValue label="Expected delivery" value={deliveryEstimate} />
      </Section>

      {trackingUrl ? (
        <Section style={{ margin: "24px 0" }}>
          <a href={trackingUrl} style={styles.button}>
            Track your parcel
          </a>
        </Section>
      ) : null}

      <Text style={styles.muted}>
        Please record a short video while opening the parcel. If anything is damaged, that
        video is all we need to replace it free of charge.
      </Text>
    </Shell>
  );
}

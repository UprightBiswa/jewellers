import { Hr, Row, Column, Section, Text } from "@react-email/components";
import { KeyValue, Shell, styles } from "./components";

export type OrderEmailItem = {
  title: string;
  variantLabel?: string | null;
  qty: number;
  lineTotal: string;
};

export default function OrderConfirmationEmail({
  name = "there",
  orderNumber = "SS-260915-0001",
  placedAt = "15 Sep 2026",
  items = [],
  subtotal = "₹0",
  discount,
  shipping = "Free",
  gst,
  total = "₹0",
  paymentMethod = "UPI",
  address = "",
  deliveryEstimate = "4–7 working days",
  trackUrl = "https://example.com/account/orders",
}: {
  name?: string;
  orderNumber?: string;
  placedAt?: string;
  items?: OrderEmailItem[];
  subtotal?: string;
  discount?: string;
  shipping?: string;
  gst?: string;
  total?: string;
  paymentMethod?: string;
  address?: string;
  deliveryEstimate?: string;
  trackUrl?: string;
}) {
  return (
    <Shell preview={`Order ${orderNumber} confirmed`}>
      <Text style={styles.heading}>Thank you, {name}</Text>
      <Text style={styles.text}>
        We have your order and are getting it ready. You will get another email the moment
        it is dispatched.
      </Text>

      <Section
        style={{
          backgroundColor: "#f5f6f8",
          borderRadius: "8px",
          margin: "20px 0",
          padding: "16px",
        }}
      >
        <KeyValue label="Order number" value={orderNumber} />
        <KeyValue label="Placed on" value={placedAt} />
        <KeyValue label="Payment" value={paymentMethod} />
        <KeyValue label="Expected delivery" value={deliveryEstimate} />
      </Section>

      <Text style={{ ...styles.label, margin: "0 0 8px" }}>ITEMS</Text>
      {items.map((item, i) => (
        <Row key={i} style={{ padding: "8px 0", borderBottom: "1px solid #e1e5ea" }}>
          <Column>
            <Text style={{ ...styles.value, margin: 0 }}>{item.title}</Text>
            <Text style={{ ...styles.label, margin: 0 }}>
              {item.variantLabel ? `${item.variantLabel} · ` : ""}Qty {item.qty}
            </Text>
          </Column>
          <Column align="right">
            <Text style={{ ...styles.value, margin: 0 }}>{item.lineTotal}</Text>
          </Column>
        </Row>
      ))}

      <Section style={{ marginTop: "16px" }}>
        <Row style={styles.row}>
          <Column><Text style={{ ...styles.label, margin: 0 }}>Subtotal</Text></Column>
          <Column align="right"><Text style={{ ...styles.text, margin: 0 }}>{subtotal}</Text></Column>
        </Row>
        {discount ? (
          <Row style={styles.row}>
            <Column><Text style={{ ...styles.label, margin: 0 }}>Discount</Text></Column>
            <Column align="right">
              <Text style={{ ...styles.text, color: "#2f7d5b", margin: 0 }}>-{discount}</Text>
            </Column>
          </Row>
        ) : null}
        <Row style={styles.row}>
          <Column><Text style={{ ...styles.label, margin: 0 }}>Delivery</Text></Column>
          <Column align="right"><Text style={{ ...styles.text, margin: 0 }}>{shipping}</Text></Column>
        </Row>
        {gst ? (
          <Row style={styles.row}>
            <Column><Text style={{ ...styles.label, margin: 0 }}>GST</Text></Column>
            <Column align="right"><Text style={{ ...styles.text, margin: 0 }}>{gst}</Text></Column>
          </Row>
        ) : null}
        <Hr style={styles.hr} />
        <Row>
          <Column><Text style={{ ...styles.value, fontSize: "17px", margin: 0 }}>Total paid</Text></Column>
          <Column align="right">
            <Text style={{ ...styles.value, fontSize: "17px", margin: 0 }}>{total}</Text>
          </Column>
        </Row>
      </Section>

      {address ? (
        <Section style={{ marginTop: "20px" }}>
          <Text style={{ ...styles.label, margin: "0 0 4px" }}>DELIVERING TO</Text>
          <Text style={{ ...styles.text, whiteSpace: "pre-line", margin: 0 }}>{address}</Text>
        </Section>
      ) : null}

      <Section style={{ margin: "24px 0 0" }}>
        <a href={trackUrl} style={styles.button}>
          Track this order
        </a>
      </Section>
    </Shell>
  );
}

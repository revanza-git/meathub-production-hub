import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface RfqResponseEmailProps {
  contactName?: string;
  referenceNo?: string;
  response?: string;
  statusLabel?: string;
  trackUrl?: string;
  validUntil?: string;
}

const CRIMSON = "#8a1c26";

export function RfqResponseEmail({
  contactName = "Pelanggan",
  referenceNo = "RFQ-000000",
  response = "Tim Meatlink telah menanggapi kebutuhan Anda.",
  statusLabel = "Ditanggapi",
  trackUrl = "https://meatlink.id",
  validUntil,
}: RfqResponseEmailProps) {
  return (
    <Html lang="id">
      <Head />
      <Preview>{`Respons untuk ${referenceNo} sudah tersedia`}</Preview>
      <Body style={{ margin: 0, background: "#ffffff", color: "#1a1a1a", fontFamily: "Arial, Helvetica, sans-serif" }}>
        <Container style={{ margin: "0 auto", maxWidth: "560px", padding: "28px 24px" }}>
          <Text style={{ margin: "0 0 20px", color: CRIMSON, fontSize: "12px", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" }}>
            Meatlink
          </Text>
          <Heading as="h1" style={{ margin: "0 0 8px", fontSize: "22px" }}>
            Permintaan Anda telah ditanggapi
          </Heading>
          <Text style={{ margin: "0 0 4px", color: "#444" }}>Halo {contactName},</Text>
          <Text style={{ margin: "0 0 20px", color: "#444" }}>
            Tim sourcing Meatlink telah memperbarui permintaan {referenceNo}.
          </Text>
          <Section style={{ border: "1px solid #e6e1da", padding: "18px" }}>
            <Text style={{ margin: "0 0 8px", color: "#777", fontSize: "12px", textTransform: "uppercase" }}>
              {statusLabel}
            </Text>
            <Text style={{ margin: 0, color: "#222", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-line" }}>
              {response}
            </Text>
            {validUntil ? (
              <Text style={{ margin: "14px 0 0", color: "#666", fontSize: "12px" }}>
                Berlaku hingga {validUntil}
              </Text>
            ) : null}
          </Section>
          <Link href={trackUrl} style={{ display: "inline-block", marginTop: "20px", background: CRIMSON, color: "#ffffff", fontSize: "13px", letterSpacing: ".1em", padding: "12px 22px", textDecoration: "none", textTransform: "uppercase" }}>
            Lihat status permintaan
          </Link>
          <Text style={{ margin: "24px 0 0", color: "#888", fontSize: "12px" }}>
            Jangan teruskan tautan ini karena memberikan akses ke ringkasan permintaan Anda.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: RfqResponseEmail,
  displayName: "Respons permintaan penawaran",
  subject: (data: Record<string, any>) =>
    `Respons ${data?.["referenceNo"] ?? "permintaan penawaran"} — Meatlink`,
  previewData: {
    contactName: "Budi Santoso",
    referenceNo: "RFQ-A1B2C3D4",
    response: "Kami dapat memenuhi kebutuhan ribeye Anda. Detail berikutnya dapat dibahas bersama tim sourcing.",
    statusLabel: "Penawaran tersedia",
    trackUrl: "https://meatlink.id/penawaran/RFQ-A1B2C3D4?token=example",
    validUntil: "30 September 2026",
  },
} satisfies TemplateEntry;
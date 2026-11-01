import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

function Email({ name, chatUrl }: { name?: string; chatUrl?: string }) {
  return (
    <Html lang="id" dir="ltr">
      <Head />
      <Preview>Tim Meatlink telah membalas percakapan Anda.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>MEATLINK</Text>
          <Heading style={heading}>Ada balasan untuk Anda</Heading>
          <Text>Halo {name || "Pelanggan"}, tim Meatlink telah membalas percakapan Anda.</Text>
          <Text>Buka chat untuk membaca balasan dan melihat foto jika ada. Masuk ke akun Anda, atau pulihkan akses menggunakan email ini jika Anda chat sebagai tamu.</Text>
          <Button href={chatUrl || "https://meatlink.id/chat"} style={button}>Buka percakapan</Button>
          <Text style={footer}>Email pemberitahuan otomatis. Balas melalui chat di Meatlink.id.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#ffffff", color: "#141414", fontFamily: "Arial, Helvetica, sans-serif" };
const container = { maxWidth: "560px", padding: "28px 24px", margin: "0 auto" };
const brand = { color: "#a3212c", fontSize: "12px", fontWeight: 700 };
const heading = { fontSize: "24px", margin: "16px 0" };
const button = { backgroundColor: "#a3212c", color: "#ffffff", padding: "14px 22px", borderRadius: "4px", marginTop: "12px" };
const footer = { color: "#6b6560", fontSize: "12px", marginTop: "24px" };

export const template = {
  component: Email,
  subject: "Tim Meatlink membalas chat Anda",
  displayName: "Balasan chat pelanggan",
  previewData: { name: "Pelanggan", chatUrl: "https://meatlink.id/chat" },
} satisfies TemplateEntry;
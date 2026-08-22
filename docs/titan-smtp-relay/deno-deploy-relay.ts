/**
 * Titan (GoDaddy) SMTP relay — deploy on Deno Deploy (https://deno.com/deploy).
 *
 * Meatlink's app server runs on Cloudflare Workers, which cannot open raw SMTP
 * sockets. This tiny relay accepts an HTTPS POST from the app and performs the
 * actual SMTP session with Titan.
 *
 * 1. Create a new Deno Deploy playground/project and paste this file.
 * 2. Set these environment variables on the Deno Deploy project:
 *      RELAY_TOKEN      a long random string you invent (shared with the app)
 *      TITAN_SMTP_HOST  smtp.titan.email
 *      TITAN_SMTP_PORT  465
 *      TITAN_SMTP_USER  cs@meatlink.id
 *      TITAN_SMTP_PASS  your Titan mailbox password
 *      TITAN_FROM_EMAIL Meatlink <cs@meatlink.id>
 *      TITAN_ADMIN_EMAIL optional bcc for an internal copy
 * 3. Copy the deployment URL (e.g. https://meatlink-mail.deno.dev) into the
 *    app secret SMTP_RELAY_URL, and RELAY_TOKEN into SMTP_RELAY_TOKEN.
 */

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = Deno.env.get("RELAY_TOKEN") ?? "";
  if (token && req.headers.get("authorization") !== `Bearer ${token}`) {
    return json({ error: "unauthorized" }, 401);
  }

  let payload: { to?: string; subject?: string; html?: string; text?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const to = String(payload.to ?? "").trim();
  const subject = String(payload.subject ?? "").trim();
  const html = String(payload.html ?? "");
  const text = String(payload.text ?? "");
  if (!to || !subject || (!html && !text)) return json({ error: "missing_fields" }, 400);

  const port = Number(Deno.env.get("TITAN_SMTP_PORT") ?? 465);
  const user = Deno.env.get("TITAN_SMTP_USER") ?? "";
  const pass = Deno.env.get("TITAN_SMTP_PASS") ?? "";
  const bcc = Deno.env.get("TITAN_ADMIN_EMAIL") ?? "";
  if (!user || !pass) return json({ sent: false, reason: "smtp_not_configured" }, 500);

  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("TITAN_SMTP_HOST") ?? "smtp.titan.email",
      port,
      tls: port === 465,
      auth: { username: user, password: pass },
    },
  });

  try {
    await client.send({
      from: Deno.env.get("TITAN_FROM_EMAIL") || user,
      to,
      ...(bcc ? { bcc: [bcc] } : {}),
      subject,
      content: text || undefined,
      html: html || undefined,
    });
    return json({ sent: true });
  } catch (err) {
    console.error("[relay] smtp error", err);
    return json({ sent: false, reason: String(err) }, 502);
  } finally {
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
});

import "server-only";
import { env } from "../env";

export type EmailMessage = { to: string; subject: string; html: string; text: string };

export type EmailDelivery = { delivered: boolean; provider: string };

/**
 * Envoi d'e-mails via le fournisseur configuré (EMAIL_PROVIDER) :
 * - `console` : développement, le message est écrit dans les logs (rien n'est envoyé) ;
 * - `smtp` : n'importe quel serveur SMTP (SMTP_URL) ;
 * - `resend` : API HTTP Resend (EMAIL_API_KEY).
 */
export async function sendEmail(message: EmailMessage): Promise<EmailDelivery> {
  const { EMAIL_PROVIDER } = env();
  const from = env().EMAIL_FROM ?? "Nous <no-reply@localhost>";

  switch (EMAIL_PROVIDER) {
    case "console": {
      console.info(
        [
          "",
          "┌─ E-mail (EMAIL_PROVIDER=console — non envoyé) ─────────────",
          `│ À       : ${message.to}`,
          `│ Sujet   : ${message.subject}`,
          "│",
          ...message.text.split("\n").map((line) => `│ ${line}`),
          "└────────────────────────────────────────────────────────────",
          "",
        ].join("\n"),
      );
      return { delivered: false, provider: "console" };
    }
    case "smtp": {
      const { createTransport } = await import("nodemailer");
      const transport = createTransport(env().SMTP_URL!);
      await transport.sendMail({ from, to: message.to, subject: message.subject, html: message.html, text: message.text });
      return { delivered: true, provider: "smtp" };
    }
    case "resend": {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env().EMAIL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`Resend a répondu ${response.status} : ${(await response.text()).slice(0, 200)}`);
      }
      return { delivered: true, provider: "resend" };
    }
  }
}

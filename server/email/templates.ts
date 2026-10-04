import "server-only";
import { env } from "../env";
import type { EmailMessage } from "./index";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

type Block = { heading: string; paragraphs: string[]; action?: { label: string; url: string }; footnote?: string };

function render(to: string, subject: string, block: Block): EmailMessage {
  const paragraphs = block.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#3f3f46">${escapeHtml(p)}</p>`)
    .join("");
  const button = block.action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr><td style="border-radius:10px;background:#18181b">
         <a href="${escapeHtml(block.action.url)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#fafafa;text-decoration:none;border-radius:10px">${escapeHtml(block.action.label)}</a>
       </td></tr></table>
       <p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#71717a">Ou copiez ce lien dans votre navigateur :<br><span style="color:#3f3f46;word-break:break-all">${escapeHtml(block.action.url)}</span></p>`
    : "";
  const footnote = block.footnote
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#a1a1aa">${escapeHtml(block.footnote)}</p>`
    : "";

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f7f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f7f6;padding:40px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #ececea;border-radius:16px">
      <tr><td style="padding:36px 36px 32px">
        <p style="margin:0 0 28px;font-size:13px;font-weight:600;letter-spacing:.02em;color:#18181b">Nous</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:600;letter-spacing:-.01em;color:#18181b">${escapeHtml(block.heading)}</h1>
        ${paragraphs}${button}${footnote}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = [
    block.heading,
    "",
    ...block.paragraphs.flatMap((p) => [p, ""]),
    ...(block.action ? [`${block.action.label} : ${block.action.url}`, ""] : []),
    ...(block.footnote ? [block.footnote] : []),
  ].join("\n");

  return { to, subject, html, text };
}

export const appUrl = (path: string) => new URL(path, env().APP_URL).toString();

export function verificationEmail(to: string, name: string, token: string): EmailMessage {
  return render(to, "Confirmez votre adresse e-mail", {
    heading: `Bienvenue, ${name}`,
    paragraphs: ["Confirmez votre adresse e-mail pour accéder à votre espace."],
    action: { label: "Confirmer mon adresse", url: appUrl(`/verify-email/confirm?token=${encodeURIComponent(token)}`) },
    footnote: "Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.",
  });
}

export function passwordResetEmail(to: string, name: string, token: string): EmailMessage {
  return render(to, "Réinitialisation de votre mot de passe", {
    heading: "Réinitialiser votre mot de passe",
    paragraphs: [`Bonjour ${name}, une demande de réinitialisation a été faite pour votre compte.`],
    action: { label: "Choisir un nouveau mot de passe", url: appUrl(`/reset-password?token=${encodeURIComponent(token)}`) },
    footnote: "Ce lien expire dans 1 heure. Si vous n'avez rien demandé, vous pouvez ignorer cet e-mail : votre mot de passe reste inchangé.",
  });
}

export function invitationEmail(to: string, inviterName: string, workspaceName: string, token: string): EmailMessage {
  return render(to, `${inviterName} vous invite à rejoindre « ${workspaceName} »`, {
    heading: "Une invitation vous attend",
    paragraphs: [`${inviterName} vous invite à rejoindre l'espace privé « ${workspaceName} ».`],
    action: { label: "Rejoindre l'espace", url: appUrl(`/invite/${encodeURIComponent(token)}`) },
    footnote: "Cette invitation expire dans 7 jours.",
  });
}

export function reminderEmail(to: string, name: string, title: string, when: string, details: string[]): EmailMessage {
  return render(to, `${when} : ${title}`, {
    heading: title,
    paragraphs: [`Bonjour ${name}, petit rappel : ${when.charAt(0).toLowerCase()}${when.slice(1)}.`, ...details],
    action: { label: "Ouvrir le calendrier", url: appUrl("/calendar") },
    footnote: "Vous recevez ce rappel car les rappels par e-mail sont activés dans vos paramètres.",
  });
}

export function partnerJoinedEmail(to: string, name: string, partnerName: string, workspaceName: string): EmailMessage {
  return render(to, `${partnerName} a rejoint « ${workspaceName} »`, {
    heading: "Votre espace est complet",
    paragraphs: [`Bonjour ${name}, ${partnerName} vient de rejoindre « ${workspaceName} ». Tout ce que vous ajoutez est désormais partagé.`],
    action: { label: "Ouvrir l'espace", url: appUrl("/") },
  });
}

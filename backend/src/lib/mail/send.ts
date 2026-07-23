import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { renderMail } from "./templates";
import type { MailPayload, MailTemplateId } from "./types";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (env.smtp.host) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth:
        env.smtp.user && env.smtp.pass
          ? { user: env.smtp.user, pass: env.smtp.pass }
          : undefined,
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

export async function sendTemplateMail<T extends MailTemplateId>(
  to: string,
  templateId: T,
  data: MailPayload[T],
): Promise<{ messageId: string; preview?: unknown }> {
  if (!env.mailEnabled) {
    return { messageId: "mail-disabled" };
  }

  const { subject, html, text } = renderMail(templateId, data);
  const transport = getTransporter();

  const info = await transport.sendMail({
    from: env.smtp.from,
    to,
    subject,
    html,
    text,
  });

  return {
    messageId: info.messageId,
    preview: env.smtp.host ? undefined : info.message,
  };
}

export async function verifyMailConnection(): Promise<boolean> {
  if (!env.mailEnabled || !env.smtp.host) return false;
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}

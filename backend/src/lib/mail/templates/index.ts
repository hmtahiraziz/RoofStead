import { env } from "../../../config/env";
import { mailLayout, paragraph } from "../layout";
import type { MailPayload, RenderedMail } from "../types";

export function renderEmailVerification(
  data: MailPayload["email_verification"],
): RenderedMail {
  const subject = `Verify your ${env.appName} email`;
  const bodyHtml = [
    paragraph(`Hi ${data.name},`),
    paragraph(`Thanks for signing up. Confirm your email to activate your account.`),
    paragraph(`This link expires in ${data.expiresHours} hours.`),
  ].join("");

  const html = mailLayout({
    preheader: "Confirm your email to finish registration",
    title: "Verify your email",
    bodyHtml,
    cta: { label: "Verify email", href: data.verifyUrl },
  });

  const text = [
    `Hi ${data.name},`,
    "",
    `Verify your email for ${env.appName}:`,
    data.verifyUrl,
    "",
    `Link expires in ${data.expiresHours} hours.`,
  ].join("\n");

  return { subject, html, text };
}

export function renderPasswordReset(data: MailPayload["password_reset"]): RenderedMail {
  const subject = `Reset your ${env.appName} password`;
  const bodyHtml = [
    paragraph(`Hi ${data.name},`),
    paragraph(`We received a request to reset your password.`),
    paragraph(`This link expires in ${data.expiresHours} hour${data.expiresHours === 1 ? "" : "s"}.`),
    paragraph(`If you did not request this, you can ignore this email.`),
  ].join("");

  const html = mailLayout({
    preheader: "Reset your RoofStead password",
    title: "Reset password",
    bodyHtml,
    cta: { label: "Reset password", href: data.resetUrl },
  });

  const text = [
    `Hi ${data.name},`,
    "",
    `Reset your ${env.appName} password:`,
    data.resetUrl,
    "",
    `Link expires in ${data.expiresHours} hour(s).`,
  ].join("\n");

  return { subject, html, text };
}

export function renderSellerVerificationSubmitted(
  data: MailPayload["seller_verification_submitted"],
): RenderedMail {
  const subject = `We received your seller verification — ${env.appName}`;
  const bodyHtml = [
    paragraph(`Hi ${data.name},`),
    paragraph(
      `Your verification documents were submitted successfully. Our team typically reviews submissions within 24 hours.`,
    ),
    paragraph(`You cannot publish listings until verification is approved. We will email you when a decision is made.`),
  ].join("");

  const html = mailLayout({
    preheader: "Verification received — review within 24 hours",
    title: "Verification submitted",
    bodyHtml,
  });

  const text = [
    `Hi ${data.name},`,
    "",
    "Your seller verification was submitted. Review may take up to 24 hours.",
    "You cannot post listings until approved.",
  ].join("\n");

  return { subject, html, text };
}

export function renderSellerVerificationApproved(
  data: MailPayload["seller_verification_approved"],
): RenderedMail {
  const subject = `You're verified — start posting on ${env.appName}`;
  const bodyHtml = [
    paragraph(`Hi ${data.name},`),
    paragraph(`Good news: your seller verification was approved.`),
    paragraph(`You can now post rental and sale listings on ${env.appName}.`),
  ].join("");

  const html = mailLayout({
    preheader: "Seller verification approved",
    title: "Verification approved",
    bodyHtml,
    cta: { label: "Post a listing", href: data.postListingUrl },
  });

  const text = [
    `Hi ${data.name},`,
    "",
    "Your seller verification was approved.",
    `Post a listing: ${data.postListingUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function renderSellerVerificationRejected(
  data: MailPayload["seller_verification_rejected"],
): RenderedMail {
  const subject = `Verification update — ${env.appName}`;
  const bodyHtml = [
    paragraph(`Hi ${data.name},`),
    paragraph(`We could not approve your seller verification at this time.`),
    paragraph(`<strong>Reason:</strong> ${escapeHtml(data.reason)}`),
    paragraph(`You may update your documents and submit again.`),
  ].join("");

  const html = mailLayout({
    preheader: "Verification not approved — you can resubmit",
    title: "Verification not approved",
    bodyHtml,
    cta: { label: "Resubmit verification", href: data.resubmitUrl },
  });

  const text = [
    `Hi ${data.name},`,
    "",
    "Your seller verification was not approved.",
    `Reason: ${data.reason}`,
    "",
    `Resubmit: ${data.resubmitUrl}`,
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const renderers = {
  email_verification: renderEmailVerification,
  password_reset: renderPasswordReset,
  seller_verification_submitted: renderSellerVerificationSubmitted,
  seller_verification_approved: renderSellerVerificationApproved,
  seller_verification_rejected: renderSellerVerificationRejected,
} as const;

export function renderMail<T extends keyof MailPayload>(
  templateId: T,
  data: MailPayload[T],
): RenderedMail {
  const renderer = renderers[templateId] as (d: MailPayload[T]) => RenderedMail;
  return renderer(data);
}

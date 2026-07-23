import { env } from "../../config/env";

type LayoutParams = {
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
};

export function mailLayout({ preheader, title, bodyHtml, cta }: LayoutParams): string {
  const ctaBlock = cta
    ? `<p style="margin:28px 0 0;">
        <a href="${cta.href}" style="display:inline-block;background:#c45c3e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;">${cta.label}</a>
       </p>
       <p style="margin:16px 0 0;font-size:12px;color:#5a6870;word-break:break-all;">${cta.href}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1a2b33;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1eb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #ddd6cb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#1f3d45,#2d5a62);padding:20px 24px;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#f8f6f2;">${env.appName}</p>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(248,246,242,0.85);">Rent &amp; sale homes</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#1a2b33;">${title}</h1>
              ${bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f6f4f0;border-top:1px solid #ddd6cb;font-size:12px;color:#5a6870;">
              You received this email because you use ${env.appName}. If you did not request this, you can ignore it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;line-height:1.6;color:#1a2b33;">${text}</p>`;
}

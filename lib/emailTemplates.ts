type VerificationEmailOptions = {
  heading: string;
  intro: string;
  code: string;
  expiresInMinutes?: number;
  footer: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;") 
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createVerificationEmail({
  heading,
  intro,
  code,
  expiresInMinutes = 15,
  footer,
}: VerificationEmailOptions) {
  const safeHeading = escapeHtml(heading);
  const safeIntro = escapeHtml(intro);
  const safeCode = escapeHtml(code);
  const safeFooter = escapeHtml(footer);

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,0.08);">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);color:#ffffff;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.78;">Ronan SAT</div>
          <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;font-weight:700;">${safeHeading}</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#334155;">${safeIntro}</p>
          <div style="margin:24px 0;padding:20px 16px;border-radius:20px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center;">
            <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#1d4ed8;font-weight:700;">Verification code</div>
            <div style="margin-top:10px;font-size:34px;line-height:1;font-weight:800;letter-spacing:0.35em;color:#0f172a;">${safeCode}</div>
          </div>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">
            This code expires in ${expiresInMinutes} minutes and can only be used once.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">${safeFooter}</p>
        </div>
      </div>
    </div>
  `;

  const text = `${heading}\n\n${intro}\n\nVerification code: ${code}\nThis code expires in ${expiresInMinutes} minutes.\n\n${footer}`;

  return { html, text };
}

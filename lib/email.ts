import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

declare global {
  var __appMailerTransporter: nodemailer.Transporter | undefined;
}

function getMailerCredentials() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured");
  }

  return { user, pass };
}

function getTransporter() {
  if (global.__appMailerTransporter) {
    return global.__appMailerTransporter;
  }

  const { user, pass } = getMailerCredentials();

  global.__appMailerTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  return global.__appMailerTransporter;
}

export async function sendEmail(payload: EmailPayload) {
  const { user } = getMailerCredentials();
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || "Ronan SAT Support";

  try {
    await getTransporter().sendMail({
      from: `"${fromName}" <${user}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  } catch (error) {
    const smtpError = error as {
      code?: string;
      responseCode?: number;
      response?: string;
    };

    const responseText = smtpError.response || "";
    const isGoogleWebLoginRequired =
      smtpError.code === "EAUTH" &&
      smtpError.responseCode === 534 &&
      responseText.includes("WebLoginRequired");

    if (isGoogleWebLoginRequired) {
      throw new Error(
        "Gmail blocked the SMTP sign-in. Open the sender Gmail account in a browser, complete any security prompts, then generate or re-generate a Gmail App Password and update EMAIL_PASS."
      );
    }

    throw error;
  }
}

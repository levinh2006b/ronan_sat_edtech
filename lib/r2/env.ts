function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getR2BucketName() {
  return getRequiredEnv("R2_BUCKET_NAME");
}

export function getR2Endpoint() {
  const explicitEndpoint = process.env.R2_ENDPOINT?.trim();
  if (explicitEndpoint) {
    const normalizedEndpoint = explicitEndpoint.replace(/^["']|["']$/g, "");
    const url = new URL(normalizedEndpoint);

    if (!url.hostname.endsWith(".r2.cloudflarestorage.com")) {
      throw new Error("R2_ENDPOINT must be the Cloudflare R2 S3 API endpoint, not a public custom domain URL.");
    }

    return url.origin;
  }

  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export function getR2AccessKeyId() {
  return getRequiredEnv("R2_ACCESS_KEY_ID");
}

export function getR2SecretAccessKey() {
  return getRequiredEnv("R2_SECRET_ACCESS_KEY");
}

export function getR2Region() {
  return process.env.R2_REGION?.trim() || "auto";
}

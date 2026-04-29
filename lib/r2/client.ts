import { S3Client } from "@aws-sdk/client-s3";

import { getR2AccessKeyId, getR2Endpoint, getR2Region, getR2SecretAccessKey } from "@/lib/r2/env";

let r2Client: S3Client | null = null;

export function getR2Client() {
  if (!r2Client) {
    r2Client = new S3Client({
      region: getR2Region(),
      endpoint: getR2Endpoint(),
      forcePathStyle: true,
      credentials: {
        accessKeyId: getR2AccessKeyId(),
        secretAccessKey: getR2SecretAccessKey(),
      },
    });
  }

  return r2Client;
}

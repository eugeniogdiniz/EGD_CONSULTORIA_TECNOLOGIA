import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/** Cliente S3 apontado para o armazenamento S3-compatível (RustFS). */
export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});

let bucketReady: Promise<void> | null = null;

/** Garante que o bucket existe (cria na primeira gravação). Idempotente e memoizado por processo. */
export function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
      logger.info("storage.bucket.created", { bucket: env.S3_BUCKET });
    }
  })().catch((err) => {
    bucketReady = null; // permite nova tentativa na próxima chamada
    throw err;
  });
  return bucketReady;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await ensureBucket();
  await s3.send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

/** URL assinada de download, válida por 5 minutos, com nome original no Content-Disposition. */
export function getSignedDownloadUrl(key: string, filename: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn: 300 },
  );
}

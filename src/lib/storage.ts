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

const credentials = { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY };

/** Cliente S3 pela rede interna (uploads, criação de bucket). */
export const s3 = new S3Client({ endpoint: env.S3_ENDPOINT, region: "us-east-1", forcePathStyle: true, credentials });

/**
 * Cliente usado só para assinar URLs de download: a assinatura inclui o host,
 * então precisa ser o endereço que o navegador do cliente alcança.
 */
const s3Public =
  env.S3_PUBLIC_ENDPOINT && env.S3_PUBLIC_ENDPOINT !== env.S3_ENDPOINT
    ? new S3Client({ endpoint: env.S3_PUBLIC_ENDPOINT, region: "us-east-1", forcePathStyle: true, credentials })
    : s3;

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
    s3Public,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    }),
    { expiresIn: 300 },
  );
}

/** Lê o objeto inteiro em memória (anexos de e-mail; arquivos pequenos). */
export async function getObject(key: string): Promise<Buffer> {
  const r = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  if (!r.Body) throw new Error(`objeto vazio: ${key}`);
  return Buffer.from(await r.Body.transformToByteArray());
}

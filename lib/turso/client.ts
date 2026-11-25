import { createClient } from "@libsql/client/web";

const TURSO_URL =
  process.env.NEXT_PUBLIC_TURSO_DATABASE_URL ||
  process.env.TURSO_DATABASE_URL ||
  "libsql://levelup-moizd.aws-ap-south-1.turso.io";

const TURSO_AUTH_TOKEN =
  process.env.NEXT_PUBLIC_TURSO_AUTH_TOKEN ||
  process.env.TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTU2MTE0MDIsImlkIjoiMDFhMjEyYzctNWMwMS03NjBmLWFlMWYtNTk2ZjBmYzQyMThiIiwia2lkIjoieWxOWFFLUTIzaE1Cc0xLZ2pUMHZpN2UtQ2N5akp5d01LWEdabmsxMkNkTSIsInJpZCI6ImRkN2ZlYWQ4LTY2NzQtNDU1Ni1iNWM1LTFhYTI4YTU5ZDhlMyJ9.XzN_w97qPOsyiRjkTpdNq5_q3_xoGXd4IZWnkTiJ-J0V-v5iQJm4VOjYjgUIyYhETl9Bk1MbUSsiNUSS3QooCg";

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getTursoClient() {
  if (!clientInstance) {
    clientInstance = createClient({
      url: TURSO_URL,
      authToken: TURSO_AUTH_TOKEN,
    });
  }
  return clientInstance;
}

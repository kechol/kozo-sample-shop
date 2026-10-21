import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

// Card numbers follow the conventions of common payment providers' test modes.
export const TEST_CARDS = {
  success: "4242424242424242",
  decline: "4000000000000002",
  delay: "4000000000000077",
} as const;

export type FakePaymentsOptions = {
  secretKey: string;
  delayMs?: number;
};

type StoredResponse = { status: number; body: unknown };

const MAX_BODY_BYTES = 16 * 1024;

export function createFakePaymentsServer({
  secretKey,
  delayMs = 3000,
}: FakePaymentsOptions): Server {
  // Replaying an idempotency key returns the first response, as real providers do.
  const responses = new Map<string, StoredResponse>();

  async function charge(
    request: IncomingMessage,
    body: unknown,
  ): Promise<StoredResponse> {
    if (request.headers.authorization !== `Bearer ${secretKey}`) {
      return error(401, "unauthorized", "Invalid API key");
    }
    const key = request.headers["idempotency-key"];
    if (typeof key !== "string" || key.length === 0) {
      return error(
        400,
        "missing_idempotency_key",
        "Idempotency-Key is required",
      );
    }
    const stored = responses.get(key);
    if (stored) return stored;

    const response = await decide(body);
    responses.set(key, response);
    return response;
  }

  async function decide(body: unknown): Promise<StoredResponse> {
    if (typeof body !== "object" || body === null) {
      return error(400, "invalid_request", "Body must be a JSON object");
    }
    const {
      amount,
      currency,
      card_number: cardNumber,
    } = body as Record<string, unknown>;
    if (!Number.isInteger(amount) || (amount as number) <= 0) {
      return error(400, "invalid_amount", "amount must be a positive integer");
    }
    if (currency !== "usd") {
      return error(400, "invalid_currency", "Only usd is supported");
    }
    switch (cardNumber) {
      case TEST_CARDS.success:
        return succeeded(amount as number);
      case TEST_CARDS.delay:
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return succeeded(amount as number);
      case TEST_CARDS.decline:
        return error(402, "card_declined", "Your card was declined");
      default:
        return error(
          402,
          "invalid_number",
          "This card number is not a test card",
        );
    }
  }

  return createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        return send(response, { status: 200, body: { ok: true } });
      }
      if (request.method === "POST" && request.url === "/v1/charges") {
        return send(response, await charge(request, await readJson(request)));
      }
      send(response, error(404, "not_found", "Not found"));
    } catch {
      send(response, error(400, "invalid_request", "Malformed request"));
    }
  });
}

function succeeded(amount: number): StoredResponse {
  return {
    status: 200,
    body: { id: `ch_${randomUUID()}`, status: "succeeded", amount },
  };
}

function error(status: number, code: string, message: string): StoredResponse {
  return { status, body: { error: { code, message } } };
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("Body too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: ServerResponse, { status, body }: StoredResponse) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

if (import.meta.main) {
  const secretKey = process.env.PAYMENTS_SECRET_KEY;
  if (!secretKey) throw new Error("PAYMENTS_SECRET_KEY is not set");
  const port = Number(process.env.FAKE_PAYMENTS_PORT ?? 4010);
  const delayMs = Number(process.env.FAKE_PAYMENTS_DELAY_MS ?? 3000);
  createFakePaymentsServer({ secretKey, delayMs }).listen(
    port,
    "127.0.0.1",
    () => {
      console.log(`Fake payments listening on http://127.0.0.1:${port}`);
    },
  );
}

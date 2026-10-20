export type ChargeRequest = {
  amountCents: number;
  cardNumber: string;
  idempotencyKey: string;
};

export type ChargeResult =
  | { status: "succeeded"; chargeId: string }
  | { status: "declined"; code: string };

export interface PaymentsClient {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

export class PaymentsError extends Error {
  override name = "PaymentsError";
}

export function createPaymentsClient({
  baseUrl,
  secretKey,
  timeoutMs = 10_000,
}: {
  baseUrl: string;
  secretKey: string;
  timeoutMs?: number;
}): PaymentsClient {
  return {
    async charge({ amountCents, cardNumber, idempotencyKey }) {
      let response: Response;
      try {
        response = await fetch(new URL("/v1/charges", baseUrl), {
          method: "POST",
          headers: {
            authorization: `Bearer ${secretKey}`,
            "content-type": "application/json",
            "idempotency-key": idempotencyKey,
          },
          body: JSON.stringify({
            amount: amountCents,
            currency: "usd",
            card_number: cardNumber,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (cause) {
        throw new PaymentsError("The payment provider is unreachable", {
          cause,
        });
      }
      const body = (await response.json().catch(() => null)) as {
        id?: string;
        error?: { code?: string };
      } | null;
      if (response.ok && typeof body?.id === "string") {
        return { status: "succeeded", chargeId: body.id };
      }
      if (response.status === 402) {
        return {
          status: "declined",
          code: body?.error?.code ?? "card_declined",
        };
      }
      throw new PaymentsError(
        `The payment provider responded with ${response.status}`,
      );
    },
  };
}

let defaultClient: PaymentsClient | undefined;

export function getPaymentsClient(): PaymentsClient {
  if (!defaultClient) {
    const baseUrl = process.env.PAYMENTS_URL;
    const secretKey = process.env.PAYMENTS_SECRET_KEY;
    if (!baseUrl || !secretKey) {
      throw new Error("PAYMENTS_URL and PAYMENTS_SECRET_KEY must be set");
    }
    defaultClient = createPaymentsClient({ baseUrl, secretKey });
  }
  return defaultClient;
}

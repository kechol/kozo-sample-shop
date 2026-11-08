import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFakePaymentsServer, TEST_CARDS } from "./server";

const secretKey = "fp_test_unit";
const server = createFakePaymentsServer({ secretKey, delayMs: 50 });
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function charge(
  body: unknown,
  {
    key = crypto.randomUUID(),
    auth = secretKey,
  }: { key?: string; auth?: string } = {},
) {
  return fetch(`${baseUrl}/v1/charges`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${auth}`,
      "content-type": "application/json",
      "idempotency-key": key,
    },
    body: JSON.stringify(body),
  });
}

const valid = { amount: 4200, currency: "usd" };

describe("fake payments", () => {
  it("rejects a wrong API key", async () => {
    const response = await charge(
      { ...valid, card_number: TEST_CARDS.success },
      { auth: "fp_test_wrong" },
    );
    expect(response.status).toBe(401);
  });

  it("charges the success card", async () => {
    const response = await charge({
      ...valid,
      card_number: TEST_CARDS.success,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "succeeded",
      amount: 4200,
    });
  });

  it("declines the decline card", async () => {
    const response = await charge({
      ...valid,
      card_number: TEST_CARDS.decline,
    });
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({
      error: { code: "card_declined", message: "Your card was declined" },
    });
  });

  it("succeeds after a delay for the delay card", async () => {
    const started = performance.now();
    const response = await charge({ ...valid, card_number: TEST_CARDS.delay });
    expect(response.status).toBe(200);
    expect(performance.now() - started).toBeGreaterThanOrEqual(45);
  });

  it("returns the first response when an idempotency key is replayed", async () => {
    const key = crypto.randomUUID();
    const first = await (
      await charge({ ...valid, card_number: TEST_CARDS.success }, { key })
    ).json();
    const second = await (
      await charge({ ...valid, card_number: TEST_CARDS.success }, { key })
    ).json();
    expect(second).toEqual(first);
  });

  it("rejects an invalid amount", async () => {
    const response = await charge({
      amount: 0,
      currency: "usd",
      card_number: TEST_CARDS.success,
    });
    expect(response.status).toBe(400);
  });
});

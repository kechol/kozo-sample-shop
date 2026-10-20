import type { AddressInfo } from "node:net";
import { createFakePaymentsServer } from "../../services/fake-payments/server";
import { createPaymentsClient } from "../../src/lib/payments/client";

export async function startFakePayments({ delayMs = 50 } = {}) {
  const secretKey = "fp_test_integration";
  const server = createFakePaymentsServer({ secretKey, delayMs });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    client: createPaymentsClient({
      baseUrl: `http://127.0.0.1:${port}`,
      secretKey,
    }),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

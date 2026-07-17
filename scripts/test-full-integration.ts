type Json = Record<string, unknown>;

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const apiBase = args.get('--api') || process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const token = args.get('--token') || process.env.ACCESS_TOKEN || '';
const wallet = args.get('--wallet') || process.env.WALLET_ADDRESS || '';
const signedXdr = args.get('--signed-xdr') || process.env.SIGNED_XDR || '';
const resumePaymentIntentId = args.get('--payment-intent-id') || process.env.PAYMENT_INTENT_ID || '';

async function request(path: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${init.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body as Json;
}

async function main() {
  console.log(`API: ${apiBase}`);
  console.log('1. Backend health');
  console.log(await request('/health'));

  console.log('2. Database health');
  console.log(await request('/health/database'));

  console.log('3. Stellar health');
  console.log(await request('/health/stellar'));

  console.log('4. Contract health/config');
  console.log(await request('/contracts/config'));

  if (!token) {
    console.log('ACCESS_TOKEN not provided. Stop before protected merchant/customer/invoice checks.');
    console.log('Authenticate with Freighter in browser, then rerun with --token <jwt>.');
    return;
  }

  if (!wallet) {
    console.log('WALLET_ADDRESS not provided. Stop before payment intent checks.');
    return;
  }

  console.log('5. Current user/merchant');
  const me = await request('/auth/me');
  console.log(me);

  console.log('6. Create customer');
  const customer = await request('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: `Integration Customer ${Date.now()}`,
      email: `integration-${Date.now()}@example.com`,
      walletAddress: wallet,
    }),
  });
  console.log(customer);

  console.log('7. Create/open invoice');
  const invoice = await request('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      title: `Integration Invoice ${Date.now()}`,
      customerId: customer.id,
      open: true,
      items: [{ description: 'Integration test item', quantity: 1, unitPrice: '1.0000000' }],
    }),
  });
  console.log(invoice);

  console.log('8. Fetch public invoice');
  const publicInvoice = await request(`/public/invoices/${invoice.publicToken}`);
  console.log(publicInvoice);

  let paymentIntentId = resumePaymentIntentId;
  if (!paymentIntentId) {
    console.log('9. Create payment intent');
    const intent = await request(`/public/invoices/${invoice.publicToken}/payment-intents`, {
      method: 'POST',
      body: JSON.stringify({ payerWallet: wallet }),
    });
    paymentIntentId = String(intent.id);
    console.log(intent);
    console.log('Unsigned XDR is ready. Sign it with Freighter, then rerun:');
    console.log(`npm exec ts-node scripts/test-full-integration.ts -- --token <jwt> --wallet ${wallet} --payment-intent-id ${paymentIntentId} --signed-xdr <xdr>`);
    return;
  }

  console.log('10. Check payment intent status');
  console.log(await request(`/payment-intents/${paymentIntentId}/status`));

  if (!signedXdr) {
    console.log('SIGNED_XDR not provided. Stop before submit.');
    return;
  }

  console.log('11. Submit signed XDR');
  const payment = await request(`/payment-intents/${paymentIntentId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ signedXdr, payerWallet: wallet }),
  });
  console.log(payment);

  console.log('12. Verify receipt');
  console.log(await request(`/payments/${payment.id}/receipt`));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

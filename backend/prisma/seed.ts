import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Supported Asset XLM
  const xlmAsset = await prisma.supportedAsset.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' }, // custom ID to prevent duplicate seeds
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      code: 'XLM',
      name: 'Stellar Lumens',
      assetType: 'NATIVE',
      network: 'TESTNET',
      decimals: 7,
      isActive: true,
    },
  });
  console.log('Seeded Supported Asset XLM:', xlmAsset.code);

  // 2. Seed Default User
  const ownerUser = await prisma.user.upsert({
    where: { email: 'admin@theanhstudio.com' },
    update: {},
    create: {
      email: 'admin@theanhstudio.com',
      displayName: 'The Anh Admin',
      status: 'ACTIVE',
    },
  });
  console.log('Seeded Owner User:', ownerUser.displayName);

  // 3. Seed Default Wallet for Owner User
  const defaultWalletPublicKey =
    'GAKCRIFFS5FQ7XTUBZZHQOXYK5I5I4ZMDC2RXXS5FU4CF5QPXK2BSMBE';
  const defaultCustomerWallet =
    'GAXJNPGDMIBEB662MUDZSUWKYUSZ4GW472N5EZQDGJTUIIGILJEITGOZ';

  const defaultWallet = await prisma.wallet.upsert({
    where: {
      publicKey_network: {
        publicKey: defaultWalletPublicKey,
        network: 'TESTNET',
      },
    },
    update: {},
    create: {
      userId: ownerUser.id,
      publicKey: defaultWalletPublicKey,
      network: 'TESTNET',
      label: 'Main Settlement Wallet',
      isPrimary: true,
      verificationStatus: 'VERIFIED',
      verifiedAt: new Date(),
    },
  });
  console.log('Seeded Owner Wallet:', defaultWallet.publicKey);

  // 4. Seed Default Merchant
  const merchant = await prisma.merchant.upsert({
    where: { slug: 'the-anh-studio' },
    update: {},
    create: {
      ownerUserId: ownerUser.id,
      businessName: 'The Anh Studio',
      slug: 'the-anh-studio',
      supportEmail: 'billing@theanhstudio.com',
      status: 'ACTIVE',
      defaultWalletId: defaultWallet.id,
      checkoutAccent: '#FFD84D',
    },
  });
  console.log('Seeded Merchant:', merchant.businessName);

  // Add membership relation
  await prisma.merchantMember.upsert({
    where: {
      merchantId_userId: {
        merchantId: merchant.id,
        userId: ownerUser.id,
      },
    },
    update: {},
    create: {
      merchantId: merchant.id,
      userId: ownerUser.id,
      role: 'OWNER',
    },
  });

  // 5. Seed default Customer
  const customer = await prisma.customer.create({
    data: {
      merchantId: merchant.id,
      name: 'Alex Morgan',
      email: 'alex@example.com',
      walletAddress: defaultCustomerWallet,
      notes: 'Standard consulting client',
    },
  });
  console.log('Seeded Customer:', customer.name);

  // 6. Seed some open invoices (but NO fake payment transaction hashes or fake confirmed payments)
  const invoice1 = await prisma.invoice.create({
    data: {
      merchantId: merchant.id,
      customerId: customer.id,
      invoiceNumber: 'LM-2026-000128',
      publicToken: 'c351b6e4e0bda7e8d5f30cb7a1f592d4',
      title: 'Website Development',
      description: 'Frontend implementation and Stellar wallet integration for Lumora Studio.',
      assetId: xlmAsset.id,
      subtotal: 125.00,
      totalAmount: 125.00,
      paymentType: 'DIRECT',
      status: 'OPEN',
      memo: 'LM000128',
      destinationWallet: defaultWallet.publicKey,
      dueAt: new Date('2026-07-30'),
      items: {
        create: [
          { name: 'React Frontend Setup & Routing', quantity: 1, unitPrice: 50.00, totalPrice: 50.00, position: 0 },
          { name: 'Stellar Wallet Abstraction Interface', quantity: 1, unitPrice: 40.00, totalPrice: 40.00, position: 1 },
          { name: 'Responsive Checkout Page UI Design', quantity: 1, unitPrice: 35.00, totalPrice: 35.00, position: 2 },
        ],
      },
    },
  });
  console.log('Seeded Invoice:', invoice1.invoiceNumber);

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

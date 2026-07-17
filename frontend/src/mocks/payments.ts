export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  asset: string;
  fromWallet: string;
  toWallet: string;
  hash: string;
  ledger: number;
  fee: string;
  timestamp: string;
  status: 'CONFIRMED' | 'FAILED' | 'PENDING';
}

export const mockPayments: Payment[] = [
  {
    id: "PAY-001",
    invoiceId: "LM-2026-000127",
    amount: "450.00",
    asset: "XLM",
    fromWallet: "GD5A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    toWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    hash: "6e268a735c05c083652f4c9c1ef34aefd40c776b9e28d4ea547ba94cb7a2cd9d",
    ledger: 48920155,
    fee: "0.00001",
    timestamp: "2026-07-10 14:32:10",
    status: "CONFIRMED"
  },
  {
    id: "PAY-002",
    invoiceId: "LM-2026-000126",
    amount: "1200.50",
    asset: "XLM",
    fromWallet: "GA1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    toWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    hash: "9af467cb2a3d0012543e098fb5de2a937a0bc815b809a7b9c9f28de3e498fc78",
    ledger: 48910023,
    fee: "0.00001",
    timestamp: "2026-07-01 09:15:44",
    status: "CONFIRMED"
  }
];

export interface Customer {
  id: string;
  name: string;
  email: string;
  wallet: string;
  invoicesCount: number;
  totalPaid: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export const mockCustomers: Customer[] = [
  {
    id: "CUST-001",
    name: "Alex Morgan",
    email: "alex@example.com",
    wallet: "GC7A5B6H3TNY5P2KMZRD6QXYUVE66V4H76WDF43G",
    invoicesCount: 3,
    totalPaid: "950.00",
    status: "ACTIVE",
    createdAt: "2026-05-12"
  },
  {
    id: "CUST-002",
    name: "Sophia Carter",
    email: "sophia@designco.com",
    wallet: "GD5A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    invoicesCount: 2,
    totalPaid: "450.00",
    status: "ACTIVE",
    createdAt: "2026-06-01"
  },
  {
    id: "CUST-003",
    name: "Michael Chang",
    email: "m.chang@techcorp.io",
    wallet: "GA1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    invoicesCount: 1,
    totalPaid: "1200.50",
    status: "ACTIVE",
    createdAt: "2026-07-01"
  },
  {
    id: "CUST-004",
    name: "David Miller",
    email: "d.miller@fintechlabs.net",
    wallet: "GC3A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    invoicesCount: 1,
    totalPaid: "0.00",
    status: "INACTIVE",
    createdAt: "2026-06-25"
  }
];

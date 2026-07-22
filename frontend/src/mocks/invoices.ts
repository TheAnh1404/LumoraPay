export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  description: string;
  amount: string;
  asset: string;
  dueDate: string;
  memo: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | 'FAILED';
  customerName: string;
  customerEmail: string;
  customerWallet: string;
  destinationWallet: string;
  createdAt: string;
  items: InvoiceItem[];
}

export const mockInvoices: Invoice[] = [
  {
    id: "LM-2026-000128",
    invoiceNumber: "LM-2026-000128",
    title: "Website Development",
    description: "Frontend implementation and Stellar wallet integration for Lumora Studio.",
    amount: "125.00",
    asset: "XLM",
    dueDate: "2026-07-30",
    memo: "LM000128",
    status: "OPEN",
    customerName: "Alex Morgan",
    customerEmail: "alex@example.com",
    customerWallet: "GC7A5B6H3TNY5P2KMZRD6QXYUVE66V4H76WDF43G",
    destinationWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    createdAt: "2026-07-15",
    items: [
      { description: "React Frontend Setup & Routing", quantity: 1, unitPrice: "50.00" },
      { description: "Stellar Wallet Abstraction Interface", quantity: 1, unitPrice: "40.00" },
      { description: "Responsive Checkout Page UI Design", quantity: 1, unitPrice: "35.00" }
    ]
  },
  {
    id: "LM-2026-000127",
    invoiceNumber: "LM-2026-000127",
    title: "UI Design Consulting",
    description: "Hour-based consultancy for Stellar wallet user flows.",
    amount: "450.00",
    asset: "XLM",
    dueDate: "2026-07-24",
    memo: "LM000127",
    status: "PAID",
    customerName: "Sophia Carter",
    customerEmail: "sophia@designco.com",
    customerWallet: "GD5A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    destinationWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    createdAt: "2026-07-10",
    items: [
      { description: "Design Consulting hours", quantity: 6, unitPrice: "75.00" }
    ]
  },
  {
    id: "LM-2026-000126",
    invoiceNumber: "LM-2026-000126",
    title: "SaaS Subscription Setup",
    description: "Setup fee for Lumora Pay enterprise merchant panel.",
    amount: "1200.50",
    asset: "XLM",
    dueDate: "2026-07-12",
    memo: "LM000126",
    status: "PAID",
    customerName: "Michael Chang",
    customerEmail: "m.chang@techcorp.io",
    customerWallet: "GA1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    destinationWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    createdAt: "2026-07-01",
    items: [
      { description: "Lumora Pay Setup & Key Provisioning", quantity: 1, unitPrice: "1200.50" }
    ]
  },
  {
    id: "LM-2026-000125",
    invoiceNumber: "LM-2026-000125",
    title: "API Integration Project",
    description: "Stellar payment gateway integration client side.",
    amount: "75.00",
    asset: "XLM",
    dueDate: "2026-07-05",
    memo: "LM000125",
    status: "FAILED",
    customerName: "David Miller",
    customerEmail: "d.miller@fintechlabs.net",
    customerWallet: "GC3A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    destinationWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    createdAt: "2026-06-28",
    items: [
      { description: "API Webhook handlers verification", quantity: 1, unitPrice: "75.00" }
    ]
  },
  {
    id: "LM-2026-000124",
    invoiceNumber: "LM-2026-000124",
    title: "Creative Branding Assets",
    description: "Logo and social media branding kit for Web3 game platform.",
    amount: "800.00",
    asset: "XLM",
    dueDate: "2026-08-15",
    memo: "LM000124",
    status: "DRAFT",
    customerName: "Sarah Connor",
    customerEmail: "sarah@skynetgaming.net",
    customerWallet: "GD8A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    destinationWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    createdAt: "2026-07-14",
    items: [
      { description: "Identity Design & Brand Manual", quantity: 1, unitPrice: "500.00" },
      { description: "Social Media templates & Banners", quantity: 1, unitPrice: "300.00" }
    ]
  },
  {
    id: "LM-2026-000123",
    invoiceNumber: "LM-2026-000123",
    title: "Domain Acquisition Support",
    description: "Brokerage service for purchasing lumorapay.co",
    amount: "250.00",
    asset: "XLM",
    dueDate: "2026-07-01",
    memo: "LM000123",
    status: "EXPIRED",
    customerName: "Sophia Carter",
    customerEmail: "sophia@designco.com",
    customerWallet: "GD5A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S",
    destinationWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    createdAt: "2026-06-15",
    items: [
      { description: "Domain Name Negotiation service", quantity: 1, unitPrice: "250.00" }
    ]
  },
  {
    id: "LM-2026-000122",
    invoiceNumber: "LM-2026-000122",
    title: "Server Deployment Automation",
    description: "Dockerization and Kubernetes setup on AWS for node backend.",
    amount: "950.00",
    asset: "XLM",
    dueDate: "2026-07-20",
    memo: "LM000122",
    status: "CANCELLED",
    customerName: "Alex Morgan",
    customerEmail: "alex@example.com",
    customerWallet: "GC7A5B6H3TNY5P2KMZRD6QXYUVE66V4H76WDF43G",
    destinationWallet: "GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ",
    createdAt: "2026-06-10",
    items: [
      { description: "Kubernetes Setup and Scripting", quantity: 1, unitPrice: "950.00" }
    ]
  }
];

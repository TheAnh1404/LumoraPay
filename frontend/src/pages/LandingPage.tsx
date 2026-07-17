import React from 'react';
import { useNavigate } from 'react-router-dom';
import MarketingLayout from '../components/layout/MarketingLayout';
import { Rocket, ShieldCheck, Cpu, Zap, CreditCard, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleDemoClick = () => {
    navigate('/app');
  };

  const handleCreateClick = () => {
    navigate('/app/invoices/create');
  };

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="max-w-container-max mx-auto px-gutter mb-xl pt-12 md:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-center">
          {/* Hero Copy */}
          <div className="lg:col-span-6 flex flex-col gap-md z-10 relative">
            <span className="bg-secondary-container text-on-secondary-container font-label-sm text-xs px-3 py-1 rounded-full w-fit uppercase tracking-wider font-semibold border border-secondary/20">
              Stellar network payments
            </span>
            <h1 className="font-display-lg-mobile text-display-lg-mobile md:font-display-lg md:text-display-lg text-primary font-black leading-none">
              Create invoices. Accept Stellar payments. Get paid globally.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
              Generate professional invoices in seconds, share payment links, accept XLM/USDC payments, and issue blockchain-backed receipts. Lumora Pay bridges traditional billing with Web3 speed.
            </p>
            <div className="flex flex-col sm:flex-row gap-sm pt-xs">
              <button 
                onClick={handleCreateClick}
                className="bg-primary text-on-primary font-label-sm text-label-sm h-12 px-md rounded flex items-center justify-center hover:bg-on-surface-variant transition-colors min-w-[180px] font-bold"
              >
                Create an Invoice
              </button>
              <button 
                onClick={handleDemoClick}
                className="bg-surface-container-lowest text-primary border border-primary font-label-sm text-label-sm h-12 px-md rounded flex items-center justify-center hover:bg-surface-container-low transition-colors min-w-[180px] font-bold"
              >
                View Demo Payment
              </button>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="lg:col-span-6 relative mt-lg lg:mt-0">
            {/* Bold yellow geometric shape backdrop */}
            <div className="absolute -top-6 -right-6 w-3/4 h-[106%] bg-secondary-container rounded-3xl transform rotate-3 z-0"></div>
            {/* Product Preview Card */}
            <div className="relative z-10 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-[0px_10px_30px_rgba(8,8,8,0.04)] overflow-hidden">
              {/* Card Header */}
              <div className="bg-surface-container-low p-md border-b border-outline-variant flex justify-between items-start">
                <div className="flex flex-col gap-xs">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Invoice #LM-2026-000128</span>
                  <span className="font-headline-md text-headline-md text-primary font-bold">Website Development</span>
                </div>
                <div className="bg-[#d3e3fd] text-[#041e49] px-3 py-1 rounded-full font-label-sm text-xs flex items-center gap-1.5 font-bold border border-blue-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0b57d0]"></div>
                  Paid
                </div>
              </div>
              {/* Card Body */}
              <div className="p-md flex flex-col gap-lg">
                <div className="flex flex-col md:flex-row gap-md justify-between items-center">
                  <div className="flex flex-col gap-xs order-2 md:order-1 text-center md:text-left w-full">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Amount Due</span>
                    <span className="font-mono-amount text-mono-amount text-primary text-4xl font-bold">125.00 XLM</span>
                    <span className="font-mono-data text-mono-data text-on-surface-variant flex items-center justify-center md:justify-start gap-1 mt-2 text-xs">
                      <span className="material-symbols-outlined text-sm">public</span>
                      Stellar Testnet
                    </span>
                  </div>
                  <div className="order-1 md:order-2 bg-white p-2 rounded-lg border border-outline-variant shadow-sm w-28 h-28 flex-shrink-0 flex items-center justify-center">
                    <img 
                      className="w-full h-full object-contain" 
                      alt="Payment QR Code" 
                      src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                    />
                  </div>
                </div>
                <div className="border-t border-outline-variant pt-md">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between font-mono-data text-mono-data text-on-surface-variant text-xs">
                      <span>Recipient Address:</span>
                      <span className="truncate ml-4 font-bold text-primary">GB3S...RFZQ</span>
                    </div>
                    <div className="flex justify-between font-mono-data text-mono-data text-on-surface-variant text-xs">
                      <span>Transaction Date:</span>
                      <span className="text-primary font-bold">Jul 15, 2026</span>
                    </div>
                    <div className="flex justify-between font-mono-data text-mono-data text-on-surface-variant text-xs">
                      <span>Network Fee:</span>
                      <span className="text-primary font-bold">0.00001 XLM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="border-y border-outline-variant py-md bg-surface-container-low mb-xl">
        <div className="max-w-container-max mx-auto px-gutter">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-md opacity-90">
            <div className="flex items-center gap-2 font-label-sm text-primary uppercase font-bold tracking-widest text-xs">
              <Rocket size={16} className="text-secondary" />
              <span>Powered by Stellar</span>
            </div>
            <div className="flex items-center gap-2 font-label-sm text-primary uppercase font-bold tracking-widest text-xs">
              <Zap size={16} className="text-secondary" />
              <span>Immediate settlement</span>
            </div>
            <div className="flex items-center gap-2 font-label-sm text-primary uppercase font-bold tracking-widest text-xs">
              <ShieldCheck size={16} className="text-secondary" />
              <span>Freighter Secured</span>
            </div>
            <div className="flex items-center gap-2 font-label-sm text-primary uppercase font-bold tracking-widest text-xs">
              <Cpu size={16} className="text-secondary" />
              <span>Smart Receipt API</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="max-w-container-max mx-auto px-gutter mb-xl space-y-lg">
        <div className="text-center max-w-2xl mx-auto space-y-xs">
          <h2 className="font-headline-lg text-headline-lg text-primary font-bold">Everything you need to accept global crypto payments</h2>
          <p className="text-on-surface-variant">Simple billing, friction-free checkout, and automatic receipt logging.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {/* Card 1 */}
          <div className="bg-surface border border-outline-variant p-md rounded-xl space-y-sm hover:border-secondary transition-colors">
            <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center text-on-secondary-container">
              <CreditCard size={24} />
            </div>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">Invoice Wizard</h3>
            <p className="text-on-surface-variant text-sm">
              Create professional, itemized billing invoices for clients in less than a minute. Save client profiles to speed up repeat invoices.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-surface border border-outline-variant p-md rounded-xl space-y-sm hover:border-secondary transition-colors">
            <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center text-on-secondary-container">
              <Zap size={24} />
            </div>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">One-Click Checkout</h3>
            <p className="text-on-surface-variant text-sm">
              Share standard payment links or QR codes. Customers pay easily using Freighter Wallet or any Stellar-compatible wallet browser.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-surface border border-outline-variant p-md rounded-xl space-y-sm hover:border-secondary transition-colors">
            <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center text-on-secondary-container">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-headline-md text-headline-md text-primary font-bold">Immutable Receipts</h3>
            <p className="text-on-surface-variant text-sm">
              Every completed checkout triggers automatic transaction verification on-chain and generates a cryptographically provable printable receipt.
            </p>
          </div>
        </div>
      </section>

      {/* Developer API Preview */}
      <section id="developers" className="max-w-container-max mx-auto px-gutter mb-xl bg-graphite text-surface p-lg rounded-2xl border border-outline/30 space-y-md">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-center">
          <div className="lg:col-span-5 space-y-sm">
            <span className="bg-secondary-container text-on-secondary-container text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider">
              Developer Friendly
            </span>
            <h2 className="font-headline-lg text-headline-lg text-white font-bold leading-tight">
              Integrate invoices directly into your backend workflow
            </h2>
            <p className="text-mutedGray text-sm">
              Create payments, track webhooks, and retrieve transaction records using simple REST HTTP queries. Designed for seamless platforms integration.
            </p>
            <button 
              onClick={() => navigate('/app/developers')}
              className="text-signalYellow hover:underline font-label-sm text-sm flex items-center gap-1"
            >
              Read API Documentation <ChevronRight size={16} />
            </button>
          </div>
          <div className="lg:col-span-7 bg-stellarBlack border border-outline/20 rounded-xl p-sm font-mono-data text-xs overflow-x-auto text-[#00ffcc]">
            <div className="flex justify-between items-center text-mutedGray border-b border-outline/10 pb-xs mb-sm">
              <span>POST /v1/invoices</span>
              <span className="text-success text-[10px]">HTTPS SECURE</span>
            </div>
            <pre className="leading-relaxed">
{`curl -X POST https://api.lumorapay.com/v1/invoices \\
  -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "125.00",
    "asset": "XLM",
    "customer": {
      "name": "Alex Morgan",
      "email": "alex@example.com"
    },
    "items": [
      { "description": "Website Design", "quantity": 1, "unitPrice": "125.0" }
    ]
  }'`}
            </pre>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-secondary-container text-on-secondary-container py-xl text-center rounded-2xl mx-gutter max-w-container-max md:mx-auto border border-secondary mb-xl space-y-md">
        <h2 className="font-display-lg-mobile md:font-headline-lg text-primary font-black">
          Ready to streamline your global checkout?
        </h2>
        <p className="max-w-lg mx-auto text-on-secondary-container/90">
          Get started with free Stellar Testnet invoicing today. No credit cards, no setup setup fees.
        </p>
        <button 
          onClick={handleCreateClick}
          className="bg-primary text-on-primary font-label-sm text-label-sm h-12 px-lg rounded hover:bg-opacity-95 transition-all inline-flex items-center gap-2 font-bold"
        >
          Get Started For Free
        </button>
      </section>
    </MarketingLayout>
  );
};
export default LandingPage;

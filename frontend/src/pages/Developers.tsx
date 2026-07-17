import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Key, Eye, EyeOff, Copy, Check, Code, Globe, AlertTriangle, ExternalLink } from 'lucide-react';
import { contractsApi, type ContractConfigDto } from '../services/api/contracts.api';
import { getContractExplorerUrl } from '../services/stellar/explorer.service';
import type { WalletNetwork } from '../types/status.types';

export const Developers: React.FC = () => {
  const [showKeys, setShowKeys] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [contractConfig, setContractConfig] = useState<ContractConfigDto | null>(null);

  const keys = {
    publishable: 'Create from backend settings',
    secret: 'Server-side only'
  };

  const handleCopy = (val: string, keyName: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    contractsApi.config().then(setContractConfig).catch(() => setContractConfig(null));
  }, []);

  const codeSnippets = {
    curl: `curl -X POST https://api.lumorapay.com/v1/invoices \\
  -H "Authorization: Bearer ${keys.secret}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "125.00",
    "asset": "XLM",
    "customer": {
      "name": "Alex Morgan",
      "email": "alex@example.com"
    },
    "items": [
      { "description": "Website Design Service", "quantity": 1, "unitPrice": "125.0" }
    ]
  }'`,
    js: `const response = await fetch('https://api.lumorapay.com/v1/invoices', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${keys.secret}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: '125.00',
    asset: 'XLM',
    customer: {
      name: 'Alex Morgan',
      email: 'alex@example.com'
    },
    items: [
      { description: 'Website Design Service', quantity: 1, unitPrice: '125.0' }
    ]
  })
});
const invoice = await response.json();
console.log('Invoice payment URL:', invoice.checkout_url);`,
    python: `import requests

headers = {
    'Authorization': 'Bearer ${keys.secret}',
    'Content-Type': 'application/json',
}

data = {
    'amount': '125.00',
    'asset': 'XLM',
    'customer': {
        'name': 'Alex Morgan',
        'email': 'alex@example.com'
    },
    'items': [
        { 'description': 'Website Design Service', 'quantity': 1, 'unitPrice': '125.0' }
    ]
}

response = requests.post('https://api.lumorapay.com/v1/invoices', headers=headers, json=data)
invoice = response.json()
print("Checkout URL:", invoice['checkout_url'])`
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        
        {/* Left Side: Keys and Settings */}
        <div className="lg:col-span-5 space-y-lg">
          {/* API Keys Card */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg space-y-md shadow-sm">
            <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
              <Key size={18} className="text-secondary" /> Sandbox API Credentials
            </h3>
            <p className="text-on-surface-variant text-xs">
              Use these credentials to authenticate API calls in sandbox/testnet environments. Never share your secret keys in client-side code.
            </p>

            <div className="space-y-sm">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-label-sm text-primary uppercase font-bold tracking-wider">Publishable Key</span>
                  <button 
                    onClick={() => handleCopy(keys.publishable, 'pub')}
                    className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {copiedKey === 'pub' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === 'pub' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <input 
                  type="text" 
                  readOnly 
                  value={keys.publishable}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-mono-data text-xs outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-label-sm text-primary uppercase font-bold tracking-wider">Secret Key</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowKeys(!showKeys)}
                      className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {showKeys ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showKeys ? 'Hide' : 'Reveal'}
                    </button>
                    <button 
                      onClick={() => handleCopy(keys.secret, 'sec')}
                      className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {copiedKey === 'sec' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                      {copiedKey === 'sec' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <input 
                  type={showKeys ? 'text' : 'password'} 
                  readOnly 
                  value={keys.secret}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 font-mono-data text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg space-y-md shadow-sm">
            <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
              <Code size={18} className="text-secondary" /> Soroban Contract Configuration
            </h3>
            {!contractConfig ? (
              <p className="text-error text-xs font-bold">Unable to load contract configuration from backend.</p>
            ) : (
              <div className="space-y-sm text-xs">
                <div className="flex justify-between gap-sm">
                  <span className="text-on-surface-variant font-bold">Network</span>
                  <span className="font-mono-data text-primary font-bold">{contractConfig.network}</span>
                </div>
                <div className="flex justify-between gap-sm">
                  <span className="text-on-surface-variant font-bold">RPC</span>
                  <span className="font-mono-data text-primary text-right truncate">{contractConfig.rpcUrl || 'Not configured'}</span>
                </div>
                {[
                  ['Invoice Registry', contractConfig.invoiceRegistryContractId, contractConfig.invoiceRegistryConfigured],
                  ['Payment Escrow', contractConfig.paymentEscrowContractId, contractConfig.paymentEscrowConfigured],
                ].map(([label, contractId, configured]) => {
                  const explorerUrl =
                    typeof contractId === 'string'
                      ? getContractExplorerUrl(contractConfig.network as WalletNetwork, contractId)
                      : null;
                  return (
                    <div key={String(label)} className="border border-outline-variant rounded-lg p-sm space-y-1">
                      <div className="flex justify-between gap-sm">
                        <span className="font-bold text-primary">{label}</span>
                        <span className={`font-bold ${configured ? 'text-success' : 'text-warning'}`}>
                          {configured ? 'Configured' : 'Missing ID'}
                        </span>
                      </div>
                      <p className="font-mono-data text-[10px] text-on-surface-variant break-all">
                        {contractId || 'Set backend env and redeploy contracts before enabling Soroban flows.'}
                      </p>
                      {explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-secondary font-bold inline-flex items-center gap-1 hover:underline"
                        >
                          Stellar Expert <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  );
                })}
                {(!contractConfig.invoiceRegistryConfigured || !contractConfig.paymentEscrowConfigured) && (
                  <div className="bg-yellow-50 border border-warning/20 text-warning p-sm rounded-lg flex gap-sm font-bold">
                    <AlertTriangle size={16} className="flex-shrink-0" />
                    <span>Escrow UI remains disabled until backend can prepare real Soroban transactions.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Webhook Configuration Card */}
          <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg space-y-md shadow-sm">
            <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
              <Globe size={18} className="text-secondary" /> Webhook Integrations
            </h3>
            <p className="text-on-surface-variant text-xs">
              Configure endpoints to receive instant alerts when a Stellar payment is settled or failed.
            </p>

            <div className="space-y-sm">
              <div className="space-y-1">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Target Endpoint URL</label>
                <input 
                  type="text" 
                  placeholder="https://api.yourdomain.com/webhooks/lumorapay"
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs outline-none"
                />
              </div>
              <div className="flex items-center gap-sm">
                <label className="flex items-center gap-2 text-xs text-primary font-bold">
                  <input type="checkbox" defaultChecked className="rounded border-outline-variant text-primary focus:ring-secondary" />
                  invoice.paid
                </label>
                <label className="flex items-center gap-2 text-xs text-primary font-bold">
                  <input type="checkbox" defaultChecked className="rounded border-outline-variant text-primary focus:ring-secondary" />
                  invoice.failed
                </label>
              </div>
              <button 
                type="button" 
                className="bg-primary text-on-primary font-label-sm text-xs py-2 px-4 rounded hover:opacity-90 font-bold w-full"
              >
                Save Webhook Settings
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Code Preview Panel */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-sm">
          <div className="p-md border-b border-outline-variant bg-surface-container-low/50 flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-primary font-bold flex items-center gap-1.5">
              <Code size={18} className="text-secondary" /> API Snippet Reference
            </h3>
            <div className="flex border border-outline-variant rounded overflow-hidden text-xs">
              <button
                onClick={() => setActiveTab('curl')}
                className={`px-3 py-1.5 font-bold transition-colors ${
                  activeTab === 'curl' ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-container'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setActiveTab('js')}
                className={`px-3 py-1.5 font-bold transition-colors ${
                  activeTab === 'js' ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-container'
                }`}
              >
                NodeJS
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1.5 font-bold transition-colors ${
                  activeTab === 'python' ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-container'
                }`}
              >
                Python
              </button>
            </div>
          </div>

          <div className="p-md bg-graphite flex-grow font-mono-data text-xs overflow-x-auto text-[#00ffcc] min-h-[300px]">
            <pre className="leading-relaxed">
              {codeSnippets[activeTab]}
            </pre>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};
export default Developers;

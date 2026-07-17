import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useWalletStore from '../../stores/wallet.store';
import { truncateAddress } from '../../utils/format';
import { Menu, X, ExternalLink } from 'lucide-react';

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const { status, address, connect, disconnect } = useWalletStore();
  const navigate = useNavigate();

  const handleConnectAndLaunch = async () => {
    setConnectError(null);
    const connectedAddress = await connect();
    if (connectedAddress) {
      setMobileMenuOpen(false);
      navigate('/app');
      return;
    }

    setConnectError(useWalletStore.getState().error || 'Unable to connect Freighter.');
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant">
        <div className="flex justify-between items-center w-full px-gutter h-16 max-w-container-max mx-auto">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-xs">
            <span className="font-headline-lg text-headline-lg font-bold text-primary">Lumora Pay</span>
          </Link>

          {/* Desktop Nav Links */}
          <ul className="hidden md:flex items-center gap-md">
            <li>
              <a href="#how-it-works" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">How It Works</a>
            </li>
            <li>
              <a href="#features" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">Features</a>
            </li>
            <li>
              <a href="#developers" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">Developers</a>
            </li>
            <li>
              <Link to="/faucet" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">Testnet Faucet</Link>
            </li>
            <li>
              <Link to="/design-guide" className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors">Design Guide</Link>
            </li>
          </ul>

          {/* Nav Actions */}
          <div className="hidden md:flex items-center gap-sm">
            <button 
              onClick={() => navigate('/app')}
              className="text-on-surface-variant hover:text-primary font-label-sm text-label-sm px-sm py-2 rounded hover:bg-surface-container-high transition-colors"
            >
              Sign In
            </button>
            {status === 'connected' && address ? (
              <div className="flex items-center gap-xs bg-surface-container-lowest border border-outline-variant px-3 py-2 rounded-lg">
                <span className="font-mono-data text-mono-data text-primary text-sm">{truncateAddress(address)}</span>
                <button 
                  onClick={disconnect}
                  className="text-error hover:text-error/80 ml-2 font-label-sm text-xs"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnectAndLaunch}
                disabled={status === 'connecting'}
                className="bg-primary text-on-primary font-label-sm text-label-sm h-12 px-sm rounded hover:bg-on-surface-variant transition-colors flex items-center justify-center min-w-[140px]"
              >
                {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
            <button 
              onClick={() => navigate('/app')}
              className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm h-12 px-sm rounded hover:bg-secondary-fixed-dim transition-colors flex items-center justify-center"
            >
              Launch App
            </button>
          </div>

          {/* Mobile Menu Icon */}
          <button 
            className="md:hidden p-xs text-on-surface-variant hover:text-primary transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface border-b border-outline-variant px-gutter py-md space-y-md animate-fade-in">
            <ul className="flex flex-col gap-sm">
              <li>
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-label-sm text-on-surface-variant hover:text-primary">How It Works</a>
              </li>
              <li>
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-label-sm text-on-surface-variant hover:text-primary">Features</a>
              </li>
              <li>
                <a href="#developers" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-label-sm text-on-surface-variant hover:text-primary">Developers</a>
              </li>
              <li>
                <Link to="/faucet" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-label-sm text-on-surface-variant hover:text-primary">Testnet Faucet</Link>
              </li>
              <li>
                <Link to="/design-guide" onClick={() => setMobileMenuOpen(false)} className="block py-2 font-label-sm text-on-surface-variant hover:text-primary">Design Guide</Link>
              </li>
            </ul>
            <div className="pt-sm border-t border-outline-variant flex flex-col gap-sm">
              <button 
                onClick={() => { setMobileMenuOpen(false); navigate('/app'); }}
                className="w-full h-12 border border-outline text-primary rounded font-label-sm hover:bg-surface-container-low"
              >
                Sign In
              </button>
              {status === 'connected' && address ? (
                <div className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant px-3 py-2 rounded-lg">
                  <span className="font-mono-data text-mono-data text-primary">{truncateAddress(address)}</span>
                  <button onClick={disconnect} className="text-error font-label-sm text-xs">Disconnect</button>
                </div>
              ) : (
                <button 
                  onClick={handleConnectAndLaunch}
                  className="w-full h-12 bg-primary text-on-primary rounded font-label-sm hover:opacity-90"
                >
                  {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
              {connectError && (
                <p className="text-error font-body-md text-sm">
                  {connectError}
                </p>
              )}
              <button 
                onClick={() => { setMobileMenuOpen(false); navigate('/app'); }}
                className="w-full h-12 bg-secondary-container text-on-secondary-container rounded font-label-sm hover:bg-secondary-fixed-dim"
              >
                Launch App
              </button>
            </div>
          </div>
        )}
      </nav>
      {connectError && !mobileMenuOpen && (
        <div className="fixed right-4 top-20 z-50 max-w-sm rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container shadow-[0px_10px_30px_rgba(8,8,8,0.08)]">
          <p className="font-label-sm text-sm font-bold">Wallet connection failed</p>
          <p className="mt-1 font-body-md text-sm">{connectError}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant py-lg mt-auto">
        <div className="max-w-container-max mx-auto px-gutter flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div className="flex flex-col gap-sm">
            <span className="font-headline-md text-headline-md font-bold text-primary">Lumora Pay</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-2 py-1 rounded w-fit border border-outline-variant">
              TESTNET NOTICE: Currently operating on Stellar Testnet only. Do not send real funds.
            </span>
          </div>
          <div className="flex gap-md font-label-sm text-label-sm text-on-surface-variant">
            <a className="hover:text-primary transition-colors flex items-center gap-1" href="https://developers.stellar.org/" target="_blank" rel="noopener noreferrer">
              Stellar Docs <ExternalLink size={14} />
            </a>
            <a className="hover:text-primary transition-colors" href="#">Support</a>
            <a className="hover:text-primary transition-colors" href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default MarketingLayout;

import React from 'react';
import { Link } from 'react-router-dom';

interface CheckoutLayoutProps {
  children: React.ReactNode;
}

export const CheckoutLayout: React.FC<CheckoutLayoutProps> = ({ children }) => {
  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md flex flex-col">
      <header className="border-b border-outline-variant/30 bg-surface py-4 px-gutter flex justify-between items-center">
        <Link to="/" className="font-headline-md text-headline-md font-black text-primary">
          Lumora Pay
        </Link>
        <div className="bg-surface-container-low border border-outline-variant px-3 py-1 rounded-full font-label-sm text-xs text-on-surface-variant flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
          Secure Stellar Checkout
        </div>
      </header>
      <main className="flex-grow flex items-center justify-center p-gutter md:py-xl">
        <div className="w-full max-w-4xl">
          {children}
        </div>
      </main>
      <footer className="py-md text-center border-t border-outline-variant/30 font-label-sm text-xs text-on-surface-variant bg-surface-container-lowest">
        Powered by Lumora Pay &copy; {new Date().getFullYear()}. Payments settle immediately on the Stellar Testnet.
      </footer>
    </div>
  );
};
export default CheckoutLayout;

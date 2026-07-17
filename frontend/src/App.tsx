import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardOverview from './pages/DashboardOverview';
import InvoiceList from './pages/InvoiceList';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Checkout from './pages/Checkout';
import ProcessingPayment from './pages/ProcessingPayment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import Receipt from './pages/Receipt';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Payments from './pages/Payments';
import CheckoutLinks from './pages/CheckoutLinks';
import Developers from './pages/Developers';
import Settings from './pages/Settings';
import TestnetFaucet from './pages/TestnetFaucet';
import TransactionHistory from './pages/TransactionHistory';
import DesignGuide from './pages/DesignGuide';
import NotFound from './pages/NotFound';
import useWalletStore from './stores/wallet.store';

function App() {
  const restoreConnection = useWalletStore((state) => state.restoreConnection);

  useEffect(() => {
    restoreConnection().catch(() => undefined);
  }, [restoreConnection]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Marketing Route */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Dashboard Private App Routes */}
        <Route path="/app" element={<DashboardOverview />} />
        <Route path="/app/invoices" element={<InvoiceList />} />
        <Route path="/app/invoices/create" element={<CreateInvoice />} />
        <Route path="/app/invoices/:invoiceId" element={<InvoiceDetail />} />
        <Route path="/app/customers" element={<Customers />} />
        <Route path="/app/customers/:customerId" element={<CustomerDetail />} />
        <Route path="/app/payments" element={<Payments />} />
        <Route path="/app/checkout-links" element={<CheckoutLinks />} />
        <Route path="/app/developers" element={<Developers />} />
        <Route path="/app/settings" element={<Settings />} />

        {/* Public Invoices Pay Checkout Flow Routes */}
        <Route path="/pay/:publicToken" element={<Checkout />} />
        <Route path="/pay/:publicToken/processing" element={<ProcessingPayment />} />
        <Route path="/pay/:publicToken/success" element={<PaymentSuccess />} />
        <Route path="/pay/:publicToken/failed" element={<PaymentFailed />} />
        
        {/* Blockchain Printable Receipt Route */}
        <Route path="/receipt/:receiptId" element={<Receipt />} />
        
        {/* Developer Sandbox Testing Utilities */}
        <Route path="/faucet" element={<TestnetFaucet />} />
        <Route path="/wallet/history" element={<TransactionHistory />} />
        
        {/* Style Guide catalog */}
        <Route path="/design-guide" element={<DesignGuide />} />

        {/* Fallback 404 handler */}
        <Route path="/*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

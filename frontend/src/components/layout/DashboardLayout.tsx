import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useWalletStore from '../../stores/wallet.store';
import { truncateAddress } from '../../utils/format';
import WalletConnectionPanel from '../wallet/WalletConnectionPanel';
import { 
  LayoutDashboard, 
  Receipt, 
  QrCode, 
  Settings, 
  Code,
  Users, 
  Activity, 
  LogOut, 
  Droplet
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { status, address, network, connect, disconnect, checkInstallation } = useWalletStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkInstallation().catch(() => undefined);
  }, [checkInstallation]);

  const handleWalletClick = async () => {
    if (status === 'connected') {
      disconnect();
    } else {
      await connect();
    }
  };

  const navLinks = [
    { to: '/app', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { to: '/app/invoices', label: 'Invoices', icon: <Receipt size={18} /> },
    { to: '/app/payments', label: 'Payments', icon: <QrCode size={18} /> },
    { to: '/app/customers', label: 'Customers', icon: <Users size={18} /> },
    { to: '/app/checkout-links', label: 'Checkout Links', icon: <Activity size={18} /> },
    { to: '/app/developers', label: 'Developers', icon: <Code size={18} /> },
    { to: '/app/settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/app') return 'Overview';
    if (path.startsWith('/app/invoices/create')) return 'Create Invoice';
    if (path.startsWith('/app/invoices/')) return 'Invoice Detail';
    if (path.startsWith('/app/invoices')) return 'Invoices';
    if (path.startsWith('/app/payments')) return 'Payments';
    if (path.startsWith('/app/customers/')) return 'Customer Detail';
    if (path.startsWith('/app/customers')) return 'Customers';
    if (path.startsWith('/app/checkout-links')) return 'Checkout Links';
    if (path.startsWith('/app/developers')) return 'Developers';
    if (path.startsWith('/app/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md flex relative">
      {/* TopNavBar (Mobile Only) */}
      <header className="md:hidden flex justify-between items-center w-full px-gutter h-16 max-w-container-max mx-auto bg-surface border-b border-outline-variant flat no shadows fixed top-0 z-40">
        <div className="font-headline-lg text-headline-lg font-bold text-primary">Lumora Pay</div>
        <div className="flex items-center gap-sm">
          {status === 'connected' && address ? (
            <button 
              onClick={handleWalletClick}
              className="bg-surface-container border border-outline px-2 py-1 rounded text-xs font-mono-data text-primary"
            >
              {truncateAddress(address)}
            </button>
          ) : (
            <button 
              onClick={handleWalletClick}
              disabled={status === 'connecting'}
              className="bg-primary text-on-primary font-label-sm text-xs px-3 py-2 rounded"
            >
              {status === 'connecting' ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </header>

      {/* SideNavBar (Desktop Only) */}
      <nav className="flex flex-col gap-sm p-sm w-[240px] h-screen hidden md:flex fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant flat no shadows z-40">
        <div className="mb-lg px-4 pt-4">
          <NavLink to="/" className="font-headline-md text-headline-md font-black text-primary block">Lumora Pay</NavLink>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-base uppercase tracking-wider">Stellar Network</p>
        </div>
        
        <div className="flex-grow flex flex-col gap-xs">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/app'}
              className={({ isActive }) =>
                `flex items-center gap-sm px-4 py-3 transition-all rounded-lg font-label-sm text-label-sm ${
                  isActive 
                    ? 'bg-secondary-container text-on-secondary-container font-bold translate-x-1' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-xs pb-4">
          <button 
            onClick={() => navigate('/app/invoices/create')}
            className="bg-primary text-on-primary font-label-sm text-label-sm py-3 px-4 rounded mb-md hover:opacity-90 transition-opacity w-full text-center flex items-center justify-center gap-2"
          >
            Create Invoice
          </button>
          <NavLink 
            to="/faucet" 
            className="flex items-center gap-sm text-on-surface-variant px-4 py-3 hover:bg-surface-container-high transition-all rounded-lg font-label-sm text-label-sm"
          >
            <Droplet size={18} />
            Testnet Faucet
          </NavLink>
          <NavLink 
            to="/wallet/history" 
            className="flex items-center gap-sm text-on-surface-variant px-4 py-3 hover:bg-surface-container-high transition-all rounded-lg font-label-sm text-label-sm"
          >
            <Activity size={18} />
            Wallet History
          </NavLink>
          <button 
            onClick={disconnect}
            className="flex items-center gap-sm text-error px-4 py-3 hover:bg-red-50 transition-all rounded-lg font-label-sm text-label-sm text-left w-full"
          >
            <LogOut size={18} />
            Disconnect Wallet
          </button>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="flex-1 min-h-screen pt-20 md:pt-0 md:ml-[240px] pb-24 md:pb-0 flex flex-col">
        {/* Canvas Header */}
        <header className="px-gutter py-md flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-outline-variant/30 bg-surface/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-sm">
            <h2 className="font-headline-lg text-headline-lg text-primary m-0">{getPageTitle()}</h2>
            <span className="bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-1 rounded border border-error/20 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[14px]">science</span>
              {network.includes('Testnet') ? 'Testnet' : 'Mainnet'}
            </span>
          </div>

          <div className="flex items-center gap-md">
            <button className="hidden md:flex p-xs text-on-surface-variant hover:text-primary transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-secondary-container rounded-full"></span>
            </button>
            
            <button 
              onClick={handleWalletClick}
              disabled={status === 'connecting'}
              className="flex items-center gap-xs bg-surface-container-lowest border border-outline px-3 py-2 rounded-lg shadow-[0px_10px_30px_rgba(8,8,8,0.04)] hover:border-secondary transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-mono-data text-[10px] border border-outline/20">
                <span className="material-symbols-outlined text-[14px]">wallet</span>
              </div>
              <span className="font-mono-data text-mono-data text-primary">
                {status === 'connected' && address
                  ? truncateAddress(address)
                  : status === 'connecting'
                    ? 'Connecting...'
                    : 'Connect Wallet'}
              </span>
              <span className="material-symbols-outlined text-outline text-[18px]">expand_more</span>
            </button>
          </div>
        </header>

        {/* Inner Content Area */}
        <div className="p-gutter max-w-container-max mx-auto space-y-md flex-1 w-full">
          {status !== 'connected' && (
            <WalletConnectionPanel />
          )}
          {children}
        </div>

        {/* BottomNavBar (Mobile Only) */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-16 px-4 pb-safe bg-surface border-t border-outline-variant shadow-[0px_-4px_12px_rgba(0,0,0,0.05)] z-40 rounded-t-xl">
          <NavLink 
            to="/app" 
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center scale-90 w-16 h-full font-label-sm text-label-sm ${
                isActive ? 'text-secondary font-bold font-fill' : 'text-on-surface-variant'
              }`
            }
          >
            <span className="material-symbols-outlined">home</span>
            <span className="mt-1">Home</span>
          </NavLink>
          <NavLink 
            to="/app/invoices" 
            className={({ isActive }) =>
              `flex flex-col items-center justify-center scale-90 w-16 h-full font-label-sm text-label-sm ${
                isActive ? 'text-secondary font-bold' : 'text-on-surface-variant'
              }`
            }
          >
            <span className="material-symbols-outlined">receipt</span>
            <span className="mt-1">Invoices</span>
          </NavLink>
          <NavLink 
            to="/app/payments" 
            className={({ isActive }) =>
              `flex flex-col items-center justify-center scale-90 w-16 h-full font-label-sm text-label-sm ${
                isActive ? 'text-secondary font-bold' : 'text-on-surface-variant'
              }`
            }
          >
            <span className="material-symbols-outlined">payments</span>
            <span className="mt-1">Payments</span>
          </NavLink>
          <NavLink 
            to="/faucet" 
            className={({ isActive }) =>
              `flex flex-col items-center justify-center scale-90 w-16 h-full font-label-sm text-label-sm ${
                isActive ? 'text-secondary font-bold' : 'text-on-surface-variant'
              }`
            }
          >
            <span className="material-symbols-outlined">water_drop</span>
            <span className="mt-1">Faucet</span>
          </NavLink>
        </nav>
      </main>
    </div>
  );
};
export default DashboardLayout;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md flex flex-col justify-center items-center p-gutter">
      <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant p-lg rounded-xl text-center space-y-md shadow-sm">
        <div className="w-16 h-16 bg-red-50 text-error rounded-full flex items-center justify-center mx-auto border border-red-200">
          <AlertCircle size={28} />
        </div>
        
        <h2 className="font-display-lg-mobile text-3xl font-black text-primary leading-tight">404 - Page Not Found</h2>
        
        <p className="text-on-surface-variant text-sm">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <button 
          onClick={() => navigate('/')}
          className="bg-primary text-on-primary font-label-sm text-sm h-12 w-full rounded-lg hover:opacity-95 font-bold transition-opacity"
        >
          Return to Landing Page
        </button>
      </div>
    </div>
  );
};
export default NotFound;

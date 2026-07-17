import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';

export const DesignGuide: React.FC = () => {
  const guideColors = [
    { name: 'Stellar Black', hex: '#080808', desc: 'Used for headers, primary buttons, and heavy UI anchors.' },
    { name: 'Warm White', hex: '#F7F5EF', desc: 'Global canvas background. Emulates high-quality editorial paper.' },
    { name: 'Signal Yellow', hex: '#FFD84D', desc: 'Primary action highlights, warning pills, and hover outline markers.' },
    { name: 'Stellar Orange', hex: '#FF6B35', desc: 'Blockchain index parameters, transaction hashes, and pipeline states.' },
    { name: 'Soft Cream', hex: '#EEEAE0', desc: 'Inset areas, table head sub-bars, and disabled components.' },
    { name: 'Border Gray', hex: '#D8D4CA', desc: '1px geometric solid dividers separating card rows.' },
    { name: 'Success Green', hex: '#168A5B', desc: 'Settled payment indicators and success messages.' },
    { name: 'Error Red', hex: '#C93636', desc: 'Horizon failure logs and inputs error alerts.' },
    { name: 'Info Blue', hex: '#315EFB', desc: 'Testnet warnings and educational banners.' }
  ];

  return (
    <DashboardLayout>
      <div className="bg-surface-container-lowest border border-outline-variant p-md md:p-lg rounded-xl space-y-lg shadow-sm">
        
        {/* Intro */}
        <div className="space-y-xs pb-md border-b border-outline-variant/30">
          <h2 className="font-display-lg text-4xl text-primary font-black">Technical Editorial Guide</h2>
          <p className="text-on-surface-variant max-w-xl">
            This catalog implements the Stellar brand architecture design tokens: paper aesthetics, solid borders, math spacing, and Courier Prime technical monospace.
          </p>
        </div>

        {/* Colors grid */}
        <div className="space-y-md">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Color Palette Scheme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            {guideColors.map((color, idx) => (
              <div key={idx} className="border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                <div className="h-16 w-full" style={{ backgroundColor: color.hex }}></div>
                <div className="p-sm space-y-1 bg-surface-container-low/20 flex-grow">
                  <h4 className="font-bold text-primary text-sm flex justify-between">
                    {color.name}
                    <span className="font-mono-data text-xs text-mutedGray font-normal">{color.hex}</span>
                  </h4>
                  <p className="text-on-surface-variant text-xs">{color.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-md border-t border-outline-variant/30 pt-lg">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Typography Rhythm</h3>
          <div className="space-y-md bg-surface-container-low/20 p-md rounded-lg border border-outline-variant/20">
            <div className="space-y-1">
              <span className="text-[10px] text-mutedGray uppercase tracking-wider block">display-lg (Inter Bold, 64px, -0.04em letter spacing)</span>
              <h1 className="font-display-lg text-primary leading-none font-bold">Accept Stellar.</h1>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-mutedGray uppercase tracking-wider block">headline-lg (Inter Semibold, 32px, -0.02em letter spacing)</span>
              <h2 className="font-headline-lg text-primary font-bold">Lumora Pay Invoicing Platform</h2>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-mutedGray uppercase tracking-wider block">mono-amount (Courier Prime Bold, 20px)</span>
              <p className="font-mono-amount text-primary font-bold">450.00 XLM</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-mutedGray uppercase tracking-wider block">mono-data (Courier Prime Regular, 14px)</span>
              <p className="font-mono-data text-on-surface-variant">GB3S67JRFZQXY3P42SFL3NEM24M4T74P6STNTRZQ</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-mutedGray uppercase tracking-wider block">label-sm (Inter Semibold, 14px, 0.05em tracking)</span>
              <span className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider">SECURE CHECKOUT CARD</span>
            </div>
          </div>
        </div>

        {/* Buttons elements */}
        <div className="space-y-md border-t border-outline-variant/30 pt-lg">
          <h3 className="font-headline-md text-headline-md font-bold text-primary">Geometric Button Elements</h3>
          <div className="flex flex-wrap gap-md items-center bg-surface-container-low/20 p-md rounded-lg border border-outline-variant/20">
            <button className="bg-primary text-on-primary font-label-sm text-xs font-bold h-12 px-md rounded-lg hover:opacity-90 transition-opacity">
              Primary Button
            </button>
            <button className="bg-secondary-container text-on-secondary-container font-label-sm text-xs font-bold h-12 px-md rounded-lg hover:bg-secondary-fixed-dim transition-colors">
              Accent/Pay Yellow
            </button>
            <button className="bg-white border border-primary text-primary font-label-sm text-xs font-bold h-12 px-md rounded-lg hover:bg-surface-container-low transition-colors">
              Secondary Outline
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};
export default DesignGuide;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useInvoiceStore } from '../stores/invoice.store';
import { useWalletStore } from '../stores/wallet.store';
import { formatAmount, formatDate } from '../utils/format';
import { 
  User, 
  FileText, 
  Eye, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Info
} from 'lucide-react';

const stellarAddressRegex = /^G[A-D2-7][A-Z2-7]{54}$/;

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Item name/description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Unit price must be greater than 0'),
});

const createInvoiceSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address'),
  customerWallet: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    return stellarAddressRegex.test(val);
  }, 'Invalid Stellar wallet address (must be a valid G address, 56 characters)'),
  title: z.string().min(1, 'Invoice title is required'),
  description: z.string().optional(),
  asset: z.string().min(1, 'Asset is required'),
  dueDate: z.string().refine((val) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(val);
    return inputDate >= today;
  }, 'Due date cannot be in the past'),
  memo: z.string().max(28, 'Stellar Text Memo is limited to 28 characters').optional(),
  items: z.array(invoiceItemSchema).min(1, 'Must add at least 1 item'),
});

interface InvoiceFormValues {
  customerName: string;
  customerEmail: string;
  customerWallet?: string;
  title: string;
  description?: string;
  asset: string;
  dueDate: string;
  memo?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: string;
  }[];
}

export const CreateInvoice: React.FC = () => {
  const navigate = useNavigate();
  const { createInvoice } = useInvoiceStore();
  const { address: merchantWallet } = useWalletStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, trigger, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      asset: 'XLM',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      items: [{ description: '', quantity: 1, unitPrice: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const formValues = watch();

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) {
      fieldsToValidate = ['customerName', 'customerEmail', 'customerWallet'];
    } else if (step === 2) {
      fieldsToValidate = ['title', 'dueDate', 'memo', 'items'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBackStep = () => {
    setStep((prev) => prev - 1);
  };

  // Calculate items sum
  const items = watch('items') || [];
  const subtotal = items.reduce((sum, item) => {
    const qty = item.quantity || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      await createInvoice({
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate,
        memo: data.memo,
        customer: {
          name: data.customerName,
          email: data.customerEmail,
          walletAddress: data.customerWallet,
        },
        items: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice).toFixed(2)
        })),
        open: true,
      }).then((invoice) => navigate(`/app/invoices/${invoice.id}`));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Wizard Progress Header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md flex items-center justify-between mb-md shadow-sm">
        <div className="flex items-center gap-xs md:gap-md w-full justify-around max-w-xl mx-auto">
          {/* Step 1 Pill */}
          <div className="flex items-center gap-xs">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= 1 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
            }`}>
              {step > 1 ? <Check size={14} /> : '1'}
            </span>
            <span className={`hidden md:inline font-label-sm text-xs uppercase tracking-wider font-bold ${
              step >= 1 ? 'text-primary' : 'text-on-surface-variant'
            }`}>Customer</span>
          </div>

          <div className="h-[1px] bg-outline-variant flex-grow max-w-[60px]"></div>

          {/* Step 2 Pill */}
          <div className="flex items-center gap-xs">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= 2 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
            }`}>
              {step > 2 ? <Check size={14} /> : '2'}
            </span>
            <span className={`hidden md:inline font-label-sm text-xs uppercase tracking-wider font-bold ${
              step >= 2 ? 'text-primary' : 'text-on-surface-variant'
            }`}>Details</span>
          </div>

          <div className="h-[1px] bg-outline-variant flex-grow max-w-[60px]"></div>

          {/* Step 3 Pill */}
          <div className="flex items-center gap-xs">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              step >= 3 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
            }`}>
              3
            </span>
            <span className={`hidden md:inline font-label-sm text-xs uppercase tracking-wider font-bold ${
              step >= 3 ? 'text-primary' : 'text-on-surface-variant'
            }`}>Review</span>
          </div>
        </div>
      </div>

      {/* Main Wizard Form Container */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md md:p-lg shadow-sm space-y-lg">
        
        {/* STEP 1: CUSTOMER METADATA */}
        {step === 1 && (
          <div className="space-y-md">
            <div className="flex items-center gap-2 pb-xs border-b border-outline-variant/30">
              <User className="text-secondary" />
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Client Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Customer Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  {...register('customerName')}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-md py-2.5 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm transition-colors"
                />
                {errors.customerName && <p className="text-error text-xs font-bold">{errors.customerName.message}</p>}
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Customer Email *</label>
                <input
                  type="email"
                  placeholder="e.g. alex@example.com"
                  {...register('customerEmail')}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-md py-2.5 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm transition-colors"
                />
                {errors.customerEmail && <p className="text-error text-xs font-bold">{errors.customerEmail.message}</p>}
              </div>
            </div>

            <div className="space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Customer Wallet Address (Stellar G Address - Optional)</label>
              <input
                type="text"
                placeholder="e.g. GC7A..."
                {...register('customerWallet')}
                className="w-full bg-surface border border-outline-variant rounded-lg px-md py-2.5 font-mono-data text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
              />
              {errors.customerWallet && <p className="text-error text-xs font-bold">{errors.customerWallet.message}</p>}
            </div>

            <div className="flex items-center gap-sm bg-surface-container-low/40 p-sm rounded-lg border border-outline-variant/30 text-on-surface-variant text-xs">
              <Info size={16} className="text-secondary flex-shrink-0" />
              <span>We will link this invoice directly to this customer profile for detailed analysis history logs.</span>
            </div>
          </div>
        )}

        {/* STEP 2: INVOICE DETAILS */}
        {step === 2 && (
          <div className="space-y-lg">
            <div className="flex items-center gap-2 pb-xs border-b border-outline-variant/30">
              <FileText className="text-secondary" />
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Invoice Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <div className="md:col-span-2 space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Invoice Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Website Development Project"
                  {...register('title')}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-md py-2.5 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm transition-colors"
                />
                {errors.title && <p className="text-error text-xs font-bold">{errors.title.message}</p>}
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Asset *</label>
                <select
                  {...register('asset')}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-md py-2.5 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm transition-colors"
                >
                  <option value="XLM">XLM (Stellar Native)</option>
                  <option value="USDC" disabled>USDC (Coming Soon)</option>
                  <option value="CUSTOM" disabled>Custom Token (Coming Soon)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Due Date *</label>
                <div className="relative">
                  <input
                    type="date"
                    {...register('dueDate')}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-md py-2.5 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm transition-colors"
                  />
                </div>
                {errors.dueDate && <p className="text-error text-xs font-bold">{errors.dueDate.message}</p>}
              </div>

              <div className="space-y-xs">
                <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Transaction Memo (Optional, Max 28 chars)</label>
                <input
                  type="text"
                  placeholder="e.g. INV-089"
                  {...register('memo')}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-md py-2.5 font-mono-data text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
                />
                {errors.memo && <p className="text-error text-xs font-bold">{errors.memo.message}</p>}
              </div>
            </div>

            <div className="space-y-xs">
              <label className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">Description / Notes</label>
              <textarea
                placeholder="Description of the project scope or terms..."
                {...register('description')}
                rows={3}
                className="w-full bg-surface border border-outline-variant rounded-lg px-md py-2.5 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm transition-colors"
              />
            </div>

            {/* Line Items Dynamic Editor */}
            <div className="space-y-sm">
              <div className="flex justify-between items-center pb-xs border-b border-outline-variant/30">
                <span className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider">Itemized Breakdown *</span>
                <button
                  type="button"
                  onClick={() => append({ description: '', quantity: 1, unitPrice: '' })}
                  className="text-secondary hover:text-secondary-fixed-dim font-label-sm text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-sm items-start">
                  <div className="col-span-6 md:col-span-8 space-y-1">
                    <input
                      placeholder="e.g. Frontend Coding Service"
                      {...register(`items.${index}.description` as const)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm transition-colors"
                    />
                    {errors.items?.[index]?.description && (
                      <p className="text-error text-[11px] font-bold">{errors.items[index]?.description?.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2 space-y-1">
                    <input
                      type="number"
                      placeholder="Qty"
                      {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm text-center transition-colors"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-error text-[11px] font-bold">{errors.items[index]?.quantity?.message}</p>
                    )}
                  </div>

                  <div className="col-span-3 md:col-span-2 space-y-1">
                    <input
                      type="text"
                      placeholder="Price"
                      {...register(`items.${index}.unitPrice` as const)}
                      className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-secondary focus:ring-1 focus:ring-secondary text-sm font-mono-amount transition-colors"
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p className="text-error text-[11px] font-bold">{errors.items[index]?.unitPrice?.message}</p>
                    )}
                  </div>

                  <div className="col-span-1 flex items-center justify-center pt-2">
                    <button
                      type="button"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      className="text-error hover:text-red-700 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {errors.items?.message && <p className="text-error text-xs font-bold">{errors.items.message}</p>}
            </div>

            {/* Subtotal Panel */}
            <div className="border-t border-outline-variant pt-md flex justify-end font-bold text-primary font-headline-md text-headline-md">
              <div className="space-x-md text-right">
                <span className="text-on-surface-variant font-label-sm text-xs uppercase tracking-wider font-bold">Total (XLM):</span>
                <span className="font-mono-amount">{formatAmount(subtotal)} XLM</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 3 && (
          <div className="space-y-lg">
            <div className="flex items-center gap-2 pb-xs border-b border-outline-variant/30">
              <Eye className="text-secondary" />
              <h3 className="font-headline-md text-headline-md text-primary font-bold">Review Invoice</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg border-b border-outline-variant/30 pb-md">
              <div className="space-y-xs">
                <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Merchant (Destination)</h4>
                <p className="font-bold text-primary">Your Connected Wallet</p>
                <p className="font-mono-data text-xs text-on-surface-variant break-all">{merchantWallet || 'Connect wallet before publishing'}</p>
              </div>

              <div className="space-y-xs">
                <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Billing Customer</h4>
                <p className="font-bold text-primary">{formValues.customerName}</p>
                <p className="text-on-surface-variant text-sm">{formValues.customerEmail}</p>
                {formValues.customerWallet && (
                  <p className="font-mono-data text-xs text-on-surface-variant break-all">Wallet: {formValues.customerWallet}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-md border-b border-outline-variant/30 pb-md">
              <div>
                <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Invoice Title</h4>
                <p className="font-bold text-primary mt-1">{formValues.title}</p>
              </div>
              <div>
                <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Due Date</h4>
                <p className="font-bold text-primary mt-1">{formatDate(formValues.dueDate)}</p>
              </div>
              <div>
                <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Transaction Memo</h4>
                <p className="font-mono-data text-primary mt-1 font-bold">{formValues.memo || 'None'}</p>
              </div>
            </div>

            {/* Items Summary Table */}
            <div className="space-y-xs">
              <h4 className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-xs">Itemized Breakdown</h4>
              <div className="border border-outline-variant rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant font-label-sm text-xs text-on-surface-variant uppercase font-bold tracking-wider">
                      <th className="p-sm">Item</th>
                      <th className="p-sm text-center">Qty</th>
                      <th className="p-sm text-right">Unit Price</th>
                      <th className="p-sm text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValues.items?.map((item, idx) => (
                      <tr key={idx} className="border-b border-outline-variant/30 last:border-b-0 text-sm">
                        <td className="p-sm font-bold text-primary">{item.description}</td>
                        <td className="p-sm text-center font-mono-data">{item.quantity}</td>
                        <td className="p-sm text-right font-mono-amount">{formatAmount(item.unitPrice)}</td>
                        <td className="p-sm text-right font-mono-amount font-bold text-primary">
                          {formatAmount((item.quantity || 0) * (parseFloat(item.unitPrice) || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col items-end gap-xs pt-xs border-t border-outline-variant/40">
              <div className="flex items-baseline gap-md">
                <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-bold">Total Invoice Amount:</span>
                <span className="font-mono-amount text-primary text-3xl font-bold">{formatAmount(subtotal)} {formValues.asset}</span>
              </div>
              <span className="text-[11px] text-[#b96b00] bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded font-bold mt-1">
                TESTNET TRANSACTION - No real asset transfer
              </span>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="border-t border-outline-variant pt-md flex justify-between items-center">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBackStep}
              className="border border-primary text-primary font-label-sm text-sm px-md h-12 rounded flex items-center justify-center gap-xs hover:bg-surface-container-low transition-colors font-bold"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/app/invoices')}
              className="border border-outline text-on-surface-variant font-label-sm text-sm px-md h-12 rounded flex items-center justify-center gap-xs hover:bg-surface-container-low transition-colors font-bold"
            >
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="bg-primary text-on-primary font-label-sm text-sm px-md h-12 rounded flex items-center justify-center gap-xs hover:bg-on-surface-variant transition-colors font-bold"
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-secondary-container text-on-secondary-container font-label-sm text-sm px-md h-12 rounded flex items-center justify-center gap-xs hover:bg-secondary-fixed-dim transition-colors font-bold disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Invoice...' : 'Publish & Create Invoice'}
            </button>
          )}
        </div>
      </form>
    </DashboardLayout>
  );
};
export default CreateInvoice;

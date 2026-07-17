export const truncateAddress = (address: string | null | undefined): string => {
  if (!address) return '';
  if (address.length <= 8) return address;
  return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
};

export const formatAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

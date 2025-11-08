import type { Database } from '@/integrations/supabase/types';

export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export const calculateInstallmentStatus = (transaction: TransactionRow) => {
  const totalInstallments = Math.max(transaction.installments ?? 1, 1);
  const paidInstallmentsRaw =
    transaction.installment_number ??
    (totalInstallments > 1 ? 0 : totalInstallments);
  const paidInstallments = Math.min(
    Math.max(paidInstallmentsRaw, 0),
    totalInstallments,
  );

  const installmentValue =
    totalInstallments > 0 ? transaction.amount / totalInstallments : transaction.amount;
  const remainingInstallments = Math.max(totalInstallments - paidInstallments, 0);
  const remainingValue = installmentValue * remainingInstallments;

  return {
    totalInstallments,
    paidInstallments,
    remainingInstallments,
    installmentValue,
    remainingValue,
    isPaidOff: remainingInstallments === 0,
  };
};

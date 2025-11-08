import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { CreditCard, Loader2, Plus, Trash2 } from 'lucide-react';
import CardWizard from '@/components/cards/CardWizard';
import RealisticCard from '@/components/cards/RealisticCard';
import { toast } from 'sonner';
import { calculateInstallmentStatus } from '@/lib/transaction-helpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type CardRow = Database['public']['Tables']['cards']['Row'];
type BankRow = Database['public']['Tables']['banks']['Row'];
type CardWithUsage = CardRow & { usedLimit: number };
type Category = Database['public']['Tables']['categories']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionWithCategory = TransactionRow & { categories?: Category | null };
type CardInvoiceRow = Database['public']['Tables']['card_invoices']['Row'];

const Cards = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardWithUsage[]>([]);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [statementMonth, setStatementMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [statementTransactions, setStatementTransactions] = useState<TransactionWithCategory[]>([]);
  const [isStatementLoading, setIsStatementLoading] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [invoiceRecord, setInvoiceRecord] = useState<CardInvoiceRow | null>(null);

  const monthOptions = useMemo(() => {
    const result: Array<{ value: string; label: string }> = [];
    const today = new Date();
    for (let index = 0; index < 12; index++) {
      const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      result.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return result;
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const getMonthBoundaries = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    const start = new Date(year, (month ?? 1) - 1, 1);
    const end = new Date(year, (month ?? 1), 0);
    return { start, end };
  };

  const toISODate = (date: Date) => date.toISOString().split('T')[0];

  const isTransactionDueInMonth = (transaction: TransactionRow, monthStart: Date) => {
    const totalInstallments = transaction.installments ?? 1;
    const paidInstallments = transaction.installment_number ?? 0;
    if (paidInstallments >= totalInstallments) return false;

    const transactionDate = new Date(transaction.transaction_date);
    const targetStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
    const targetEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    if (transactionDate > targetEnd) {
      return false;
    }

    const monthDifference =
      (targetStart.getFullYear() - transactionDate.getFullYear()) * 12 +
      (targetStart.getMonth() - transactionDate.getMonth());

    if (monthDifference < 0) {
      return false;
    }

    return monthDifference >= paidInstallments;
  };

  const getInstallmentValue = (transaction: TransactionWithCategory) =>
    calculateInstallmentStatus(transaction).installmentValue;

  const loadCards = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Load transactions to calculate used limit
      const cardsWithUsage = await Promise.all<CardWithUsage>(
        data.map(async (card) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user?.id)
            .eq('source_id', card.id)
            .eq('source_type', 'card')
            .eq('type', 'expense');
          
          const usedLimit =
            transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          return { ...card, usedLimit };
        })
      );
      setCards(cardsWithUsage);
    }
  }, [user]);

  const loadBanks = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('banks')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setBanks(data as BankRow[]);
  }, [user]);

  useEffect(() => {
    loadCards();
    loadBanks();
  }, [loadBanks, loadCards]);

  useEffect(() => {
    if (!selectedCardId && cards.length > 0) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards, selectedCardId]);

  const loadStatement = useCallback(async () => {
    if (!user || !selectedCardId) {
      setStatementTransactions([]);
      return;
    }

    setIsStatementLoading(true);
    const { start, end } = getMonthBoundaries(statementMonth);

    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .eq('source_type', 'card')
      .eq('source_id', selectedCardId)
      .lte('transaction_date', toISODate(end))
      .order('transaction_date', { ascending: true });

    if (error) {
      console.error('Erro ao carregar fatura', error);
      toast.error('Erro ao carregar fatura do cartão');
      setStatementTransactions([]);
      setIsStatementLoading(false);
      return;
    }

    const dueTransactions = (data as TransactionWithCategory[]).filter((transaction) =>
      isTransactionDueInMonth(transaction, start),
    );

    setStatementTransactions(dueTransactions);
    setSelectedTransactionIds([]);

    const { data: invoiceData, error: invoiceError } = await supabase
      .from('card_invoices')
      .select('*')
      .eq('user_id', user.id)
      .eq('card_id', selectedCardId)
      .eq('month', toISODate(start))
      .maybeSingle();

    if (invoiceError && invoiceError.code !== 'PGRST116') {
      console.error('Erro ao carregar status da fatura', invoiceError);
    }

    setInvoiceRecord(invoiceData ?? null);
    setIsStatementLoading(false);
  }, [selectedCardId, statementMonth, user]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  const statementSummary = useMemo(() => {
    return statementTransactions.reduce(
      (acc, transaction) => {
        const status = calculateInstallmentStatus(transaction);
        acc.totalDue += status.installmentValue;
        acc.installmentsOpen += status.remainingInstallments;
        return acc;
      },
      { totalDue: 0, installmentsOpen: 0 },
    );
  }, [statementTransactions]);

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactionIds((prev) =>
      prev.includes(transactionId) ? prev.filter((id) => id !== transactionId) : [...prev, transactionId],
    );
  };

  const registerInstallmentProgress = useCallback(
    async (transactionsToUpdate: TransactionWithCategory[]) => {
      if (!user || transactionsToUpdate.length === 0) {
        return;
      }

      await Promise.all(
        transactionsToUpdate.map(async (transaction) => {
          const totalInstallments = transaction.installments ?? 1;
          const currentPaid = transaction.installment_number ?? 0;
          const nextValue = Math.min(totalInstallments, currentPaid + 1);

          if (nextValue === currentPaid) {
            return;
          }

          const { error } = await supabase
            .from('transactions')
            .update({ installment_number: nextValue })
            .eq('id', transaction.id)
            .eq('user_id', user.id);

          if (error) {
            throw error;
          }
        }),
      );
    },
    [user],
  );

  const updateInvoiceRecord = useCallback(
    async (paidDelta: number, targetStatus: 'paid' | 'partial') => {
      if (!user || !selectedCardId || paidDelta <= 0) return;

      const { start } = getMonthBoundaries(statementMonth);
      const previouslyPaid = invoiceRecord?.paid_amount ?? 0;
      const inferredTotal =
        invoiceRecord?.total_amount ??
        parseFloat((statementSummary.totalDue + previouslyPaid).toFixed(2));
      const adjustedTotal = inferredTotal === 0 ? parseFloat((previouslyPaid + paidDelta).toFixed(2)) : inferredTotal;
      const newPaidAmount = parseFloat((previouslyPaid + paidDelta).toFixed(2));
      const finalStatus = targetStatus === 'paid' || newPaidAmount >= adjustedTotal ? 'paid' : 'partial';

      const { error } = await supabase
        .from('card_invoices')
        .upsert(
          {
            user_id: user.id,
            card_id: selectedCardId,
            month: toISODate(start),
            total_amount: adjustedTotal,
            paid_amount: newPaidAmount,
            status: finalStatus,
            paid_at: finalStatus === 'paid' ? new Date().toISOString() : null,
          },
          {
            onConflict: 'user_id,card_id,month',
          },
        );

      if (error) {
        throw error;
      }
    },
    [invoiceRecord?.paid_amount, invoiceRecord?.total_amount, selectedCardId, statementMonth, statementSummary.totalDue, user],
  );

  const handleMarkInvoiceAsPaid = async () => {
    if (!statementTransactions.length || !selectedCardId) {
      toast.info('Nenhuma parcela pendente para registrar.');
      return;
    }

    setIsRegisteringPayment(true);
    try {
      const totalToRegister = statementTransactions.reduce(
        (sum, transaction) => sum + getInstallmentValue(transaction),
        0,
      );
      await registerInstallmentProgress(statementTransactions);
      await updateInvoiceRecord(totalToRegister, 'paid');
      toast.success('Fatura registrada como paga!');
      await loadStatement();
      await loadCards();
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível registrar o pagamento da fatura.');
    } finally {
      setIsRegisteringPayment(false);
    }
  };

  const handlePartialPayment = async () => {
    const transactionsToUpdate = statementTransactions.filter((transaction) =>
      selectedTransactionIds.includes(transaction.id),
    );

    if (transactionsToUpdate.length === 0) {
      toast.info('Selecione ao menos uma parcela para registrar o pagamento parcial.');
      return;
    }

    setIsRegisteringPayment(true);
    try {
      const partialValue = transactionsToUpdate.reduce(
        (sum, transaction) => sum + getInstallmentValue(transaction),
        0,
      );
      await registerInstallmentProgress(transactionsToUpdate);
      await updateInvoiceRecord(partialValue, 'partial');
      toast.success('Pagamento parcial registrado!');
      setSelectedTransactionIds([]);
      await loadStatement();
      await loadCards();
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível registrar o pagamento parcial.');
    } finally {
      setIsRegisteringPayment(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteCardId) return;

    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', deleteCardId);

    if (error) {
      toast.error('Erro ao excluir cartão');
      return;
    }

    toast.success('Cartão excluído com sucesso');
    setDeleteCardId(null);
    if (selectedCardId === deleteCardId) {
      setSelectedCardId(null);
      setStatementTransactions([]);
    }
    loadCards();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Cartões & Bancos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seus cartões e contas bancárias
        </p>
        </div>
        <Button 
          onClick={() => setWizardOpen(true)}
          className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Cartão
        </Button>
      </div>

      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selecione um cartão</CardTitle>
            <p className="text-sm text-muted-foreground">
              Deslize para ver todos os cartões e acompanhe o limite utilizado em tempo real.
            </p>
          </CardHeader>
          <CardContent>
            <Carousel opts={{ align: 'start', containScroll: 'trimSnaps' }} className="w-full">
              <CarouselContent>
                {cards.map((cardItem) => {
                  const isActive = cardItem.id === selectedCardId;
                  return (
                    <CarouselItem key={cardItem.id} className="md:basis-1/2 lg:basis-1/3">
                      <button
                        type="button"
                        onClick={() => setSelectedCardId(cardItem.id)}
                        className={`w-full rounded-2xl border bg-gradient-to-b from-muted/40 to-muted/10 p-4 text-left transition-all duration-200 hover:shadow-lg ${
                          isActive ? 'border-primary shadow-lg ring-2 ring-primary/40' : 'border-transparent'
                        }`}
                      >
                        <RealisticCard
                          nickname={cardItem.card_nickname}
                          brand={cardItem.card_brand}
                          last4={cardItem.card_number_last4}
                          holderName={cardItem.cardholder_name}
                          gradientStart={cardItem.card_gradient_start}
                          gradientEnd={cardItem.card_gradient_end}
                          creditLimit={cardItem.credit_limit}
                          usedLimit={cardItem.usedLimit}
                        />
                        <div className="mt-4 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Limite utilizado</span>
                          <span className="font-semibold">{formatCurrency(cardItem.usedLimit)}</span>
                        </div>
                      </button>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="-left-3 hidden md:flex" />
              <CarouselNext className="-right-3 hidden md:flex" />
            </Carousel>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Fatura do mês</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedCard
                  ? `Cartão ${selectedCard.card_nickname || selectedCard.card_brand}`
                  : 'Cadastre ou selecione um cartão para acompanhar as faturas.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statementMonth} onValueChange={setStatementMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedCard ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Valor devido</p>
                  <p className="text-2xl font-bold text-expense">{formatCurrency(statementSummary.totalDue)}</p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Parcelas em aberto</p>
                  <p className="text-2xl font-bold">{statementSummary.installmentsOpen}</p>
                </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Lançamentos do mês</p>
                <p className="text-2xl font-bold">{statementTransactions.length}</p>
              </div>
              {invoiceRecord && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Status da fatura</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={invoiceRecord.status === 'paid' ? 'default' : 'outline'}>
                      {invoiceRecord.status === 'paid' ? 'Paga' : 'Parcial'}
                    </Badge>
                    {invoiceRecord.paid_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(invoiceRecord.paid_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pago {formatCurrency(invoiceRecord.paid_amount ?? 0)} de{' '}
                    {formatCurrency(invoiceRecord.total_amount ?? 0)}
                  </p>
                </div>
              )}
            </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  className="gap-2"
                  onClick={handleMarkInvoiceAsPaid}
                  disabled={isRegisteringPayment || statementTransactions.length === 0}
                >
                  {isRegisteringPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Marcar fatura atual como paga
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handlePartialPayment}
                  disabled={isRegisteringPayment || selectedTransactionIds.length === 0}
                >
                  Registrar pagamento parcial
                </Button>
                {selectedTransactionIds.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {selectedTransactionIds.length} parcelas selecionadas
                  </Badge>
                )}
              </div>

              <div className="mt-6">
                {isStatementLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Carregando fatura...
                  </div>
                ) : statementTransactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Nenhuma parcela pendente para este mês.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {statementTransactions.map((transaction) => {
                      const isSelected = selectedTransactionIds.includes(transaction.id);
                      const status = calculateInstallmentStatus(transaction);
                      const totalInstallments = transaction.installments ?? 1;
                      const currentInstallment = Math.min(
                        (transaction.installment_number ?? 0) + 1,
                        totalInstallments,
                      );

                      return (
                        <div
                          key={transaction.id}
                          className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all md:flex-row md:items-center md:justify-between ${
                            isSelected ? 'border-primary bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                            />
                            <div>
                              <p className="font-semibold">
                                {transaction.description || 'Compra sem descrição'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(transaction.transaction_date)} • Parcela {currentInstallment}/
                                {totalInstallments}
                              </p>
                              {transaction.categories?.name && (
                                <Badge variant="outline" className="mt-2 w-fit">
                                  {transaction.categories.icon} {transaction.categories.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-expense">
                              {formatCurrency(status.installmentValue)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {status.remainingInstallments === 0
                                ? 'Parcelas quitadas'
                                : `${status.remainingInstallments} parcela(s) restante(s)`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cadastre um cartão para visualizar a fatura mensal e registrar pagamentos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cards Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="h-6 w-6" />
          Meus Cartões
        </h2>
        
        {cards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Você ainda não tem cartões cadastrados
              </p>
              <Button onClick={() => setWizardOpen(true)}>
                Adicionar primeiro cartão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id} className="relative group">
                <RealisticCard
                  nickname={card.card_nickname}
                  brand={card.card_brand}
                  last4={card.card_number_last4}
                  holderName={card.cardholder_name}
                  gradientStart={card.card_gradient_start}
                  gradientEnd={card.card_gradient_end}
                  creditLimit={card.credit_limit}
                  usedLimit={card.usedLimit}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteCardId(card.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banks Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Contas Bancárias</h2>
        
        {banks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Nenhuma conta bancária cadastrada
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {banks.map((bank) => (
              <Card key={bank.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {bank.bank_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {bank.nickname && (
                      <p className="text-muted-foreground">{bank.nickname}</p>
                    )}
                    {bank.account_number && (
                      <p>Conta: {bank.account_number}</p>
                    )}
                    {bank.branch_number && (
                      <p>Agência: {bank.branch_number}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CardWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={loadCards}
      />

      <AlertDialog open={!!deleteCardId} onOpenChange={() => setDeleteCardId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita.
              As transações relacionadas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Cards;

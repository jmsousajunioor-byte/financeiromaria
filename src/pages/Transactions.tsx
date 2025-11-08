import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateInstallmentStatus } from '@/lib/transaction-helpers';

const transactionSchema = z
  .object({
    type: z.enum(['expense', 'income']),
    amount: z.string().min(1, 'Valor é obrigatório'),
    description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
    category_id: z.string().optional(),
    source_type: z.enum(['card', 'bank']).optional(),
    source_id: z.string().optional(),
    payment_method: z.string().optional(),
    transaction_date: z.string(),
    notes: z.string().optional(),
    isInstallment: z.boolean().optional(),
    installments: z.string().optional(),
    installmentsPaid: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'expense' && data.isInstallment) {
      const total = parseInt(data.installments || '', 10);
      const paid = parseInt(data.installmentsPaid || '', 10);

      if (!data.installments || Number.isNaN(total) || total < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe um número válido de parcelas',
          path: ['installments'],
        });
      }

      if (Number.isNaN(paid) || paid < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe quantas parcelas já foram pagas',
          path: ['installmentsPaid'],
        });
      }

      if (!Number.isNaN(total) && !Number.isNaN(paid) && paid > total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Parcelas pagas não pode ser maior que o total',
          path: ['installmentsPaid'],
        });
      }
    }
  });

type TransactionFormValues = z.infer<typeof transactionSchema>;

type Category = Database['public']['Tables']['categories']['Row'];
type CardOption = Pick<Database['public']['Tables']['cards']['Row'], 'id' | 'card_brand' | 'card_nickname'>;
type BankOption = Pick<Database['public']['Tables']['banks']['Row'], 'id' | 'bank_name' | 'nickname'>;
type TransactionRow = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Category | null;
};

const createDefaultValues = (): TransactionFormValues => ({
  type: 'expense',
  amount: '',
  description: '',
  category_id: undefined,
  source_type: undefined,
  source_id: undefined,
  payment_method: 'debit',
  transaction_date: new Date().toISOString().split('T')[0],
  notes: '',
  isInstallment: false,
  installments: '1',
  installmentsPaid: '0',
});

const Transactions = () => {
  const { user } = useAuth();
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CardOption[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionRow | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: createDefaultValues(),
  });
  const transactionType = form.watch('type');
  const isInstallment = form.watch('isInstallment');
  const watchedSourceType = form.watch('source_type');
  const isEditing = Boolean(editingTransaction);

  const getDefaultInstallmentsPaid = useCallback(() => {
    const currentType = form.getValues('type');
    const sourceTypeValue = form.getValues('source_type');
    if (currentType === 'income') {
      return '1';
    }
    if (sourceTypeValue === 'card') {
      return '0';
    }
    return '1';
  }, [form]);

  useEffect(() => {
    if (transactionType === 'income') {
      form.setValue('payment_method', undefined);
      form.setValue('isInstallment', false);
      form.setValue('installments', '1');
      form.setValue('installmentsPaid', '1');
    } else {
      if (!form.getValues('payment_method')) {
        form.setValue('payment_method', 'debit');
      }
      form.setValue('installmentsPaid', getDefaultInstallmentsPaid());
    }
  }, [transactionType, form, getDefaultInstallmentsPaid]);

  useEffect(() => {
    if (transactionType === 'expense' && !form.getValues('isInstallment')) {
      form.setValue('installmentsPaid', getDefaultInstallmentsPaid());
    }
  }, [watchedSourceType, transactionType, form, getDefaultInstallmentsPaid]);

  const createDefaultExpenseCategories = useCallback(async () => {
    if (!user) return;
    const defaultCategories = [
      { name: 'Alimenta��o', icon: '??', color: '#EF4444', type: 'expense' },
      { name: 'Transporte', icon: '??', color: '#F59E0B', type: 'expense' },
      { name: 'Moradia', icon: '??', color: '#8B5CF6', type: 'expense' },
      { name: 'Sa�de', icon: '??', color: '#EC4899', type: 'expense' },
      { name: 'Educa��o', icon: '??', color: '#3B82F6', type: 'expense' },
      { name: 'Lazer', icon: '??', color: '#10B981', type: 'expense' },
      { name: 'Compras', icon: '???', color: '#F97316', type: 'expense' },
      { name: 'Outros', icon: '??', color: '#6B7280', type: 'expense' },
    ];

    await supabase.from('categories').insert(
      defaultCategories.map(cat => ({
        ...cat,
        user_id: user?.id,
        is_default: true,
      }))
    );
  }, [user]);

  const createDefaultIncomeCategories = useCallback(async () => {
    if (!user) return;
    const defaultIncomeCategories = [
      { name: 'Sal�rio', icon: '??', color: '#22c55e', type: 'income' },
      { name: 'Investimento', icon: '??', color: '#0ea5e9', type: 'income' },
      { name: 'Outro', icon: '??', color: '#a855f7', type: 'income' },
    ];

    await supabase.from('categories').insert(
      defaultIncomeCategories.map((cat) => ({
        ...cat,
        user_id: user?.id,
        is_default: true,
      })),
    );
  }, [user]);

  const loadCategories = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user?.id);

    if (error) {
      console.error('Erro ao carregar categorias', error);
      return;
    }

    if (data) {
      const expenses = data.filter((cat) => cat.type === 'expense');
      const incomes = data.filter((cat) => cat.type === 'income');

      if (expenses.length === 0) {
        await createDefaultExpenseCategories();
        return loadCategories();
      }

      if (incomes.length === 0) {
        await createDefaultIncomeCategories();
        return loadCategories();
      }

      setExpenseCategories(expenses);
      setIncomeCategories(incomes);
    }
  }, [createDefaultExpenseCategories, createDefaultIncomeCategories, user]);

  const loadTransactions = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar transa��es');
      return;
    }

    if (data) setTransactions(data as TransactionRow[]);
  }, [user]);

  const loadSources = useCallback(async () => {
    if (!user) return;

    const [{ data: cardsData, error: cardsError }, { data: banksData, error: banksError }] = await Promise.all([
      supabase
        .from('cards')
        .select('id, card_brand, card_nickname')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('banks')
        .select('id, bank_name, nickname')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (cardsError) {
      console.error('Erro ao carregar cartões', cardsError);
    } else if (cardsData) {
      setCards(cardsData as CardOption[]);
    }

    if (banksError) {
      console.error('Erro ao carregar bancos', banksError);
    } else if (banksData) {
      setBanks(banksData as BankOption[]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadCategories();
    loadTransactions();
    loadSources();
  }, [user, loadCategories, loadTransactions, loadSources]);

  const resetForm = () => {
    form.reset(createDefaultValues());
    setEditingTransaction(null);
  };

  const handleEditTransaction = (transaction: TransactionRow) => {
    const isExpenseInstallment =
      transaction.type === 'expense' && (transaction.installments ?? 1) > 1;

    setEditingTransaction(transaction);
    form.reset({
      type: transaction.type as 'expense' | 'income',
      amount: transaction.amount?.toString() ?? '',
      description: transaction.description ?? '',
      category_id: transaction.category_id ?? undefined,
      payment_method: transaction.payment_method ?? undefined,
      source_type: transaction.source_type as 'card' | 'bank' | undefined,
      source_id: transaction.source_id ?? undefined,
      transaction_date: transaction.transaction_date?.split('T')[0] ?? '',
      notes: transaction.notes ?? '',
      isInstallment: isExpenseInstallment,
      installments: (transaction.installments ?? 1).toString(),
      installmentsPaid: (
        transaction.source_type === 'card'
          ? transaction.installment_number ?? 0
          : transaction.installment_number ?? transaction.installments ?? 1
      ).toString(),
    });
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user) return;
    const confirmed = window.confirm('Tem certeza que deseja excluir esta transação?');
    if (!confirmed) return;

    setActionLoadingId(transactionId);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', user.id);

    setActionLoadingId(null);

    if (error) {
      toast.error('Erro ao excluir transação');
      return;
    }

    if (editingTransaction?.id === transactionId) {
      resetForm();
    }

    toast.success('Transação excluída com sucesso!');
    loadTransactions();
  };

  const onSubmit = async (data: TransactionFormValues) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsLoading(true);
    
    const isIncome = data.type === 'income';
    const totalInstallments =
      !isIncome && data.isInstallment ? Math.max(1, parseInt(data.installments || '1', 10)) : 1;

    let paidInstallmentsRaw: number;
    if (isIncome) {
      paidInstallmentsRaw = totalInstallments;
    } else if (data.source_type === 'card') {
      paidInstallmentsRaw = parseInt(data.installmentsPaid || '0', 10);
    } else if (data.isInstallment) {
      paidInstallmentsRaw = parseInt(data.installmentsPaid || '0', 10);
    } else {
      paidInstallmentsRaw = totalInstallments;
    }
    const paidInstallments = Math.min(
      Math.max(paidInstallmentsRaw || 0, 0),
      totalInstallments,
    );

    const payload = {
      user_id: user.id,
      type: data.type,
      amount: parseFloat(data.amount),
      description: data.description,
      category_id: data.category_id || null,
      payment_method: isIncome ? null : data.payment_method || null,
      source_type: data.source_id ? data.source_type || null : null,
      source_id: data.source_id || null,
      transaction_date: data.transaction_date,
      notes: data.notes || null,
      installments: totalInstallments,
      installment_number: paidInstallments,
    };

    let error;

    if (editingTransaction) {
      const response = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', editingTransaction.id)
        .eq('user_id', user.id);
      error = response.error;
    } else {
      const response = await supabase
        .from('transactions')
        .insert(payload);
      error = response.error;
    }

    setIsLoading(false);

    if (error) {
      toast.error(editingTransaction ? 'Erro ao atualizar transação' : 'Erro ao criar transação');
      return;
    }

    toast.success(editingTransaction ? 'Transação atualizada com sucesso!' : 'Transação criada com sucesso!');
    resetForm();
    loadTransactions();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Transações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas receitas e despesas
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Transação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Tabs defaultValue="expense" onValueChange={(value) => form.setValue('type', value as 'expense' | 'income')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expense" className="gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Despesa
                    </TabsTrigger>
                    <TabsTrigger value="income" className="gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Receita
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0,00" 
                          type="number" 
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(cards.length > 0 || banks.length > 0) && (
                  <FormField
                    control={form.control}
                    name="source_id"
                    render={({ field }) => {
                      const currentType = form.getValues('source_type');
                      const currentValue =
                        field.value && currentType ? `${currentType}:${field.value}` : 'none';

                      return (
                        <FormItem>
                          <FormLabel>
                            {transactionType === 'income'
                              ? 'Conta de destino'
                              : 'Cartão / conta utilizada'}
                          </FormLabel>
                          <Select
                            value={currentValue}
                            onValueChange={(value) => {
                              if (value === 'none') {
                                field.onChange('');
                                form.setValue('source_type', undefined);
                                return;
                              }
                              const [type, id] = value.split(':');
                              field.onChange(id);
                              form.setValue('source_type', type as 'card' | 'bank');
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma opção" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Não vincular</SelectItem>
                              {cards.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Cartões</SelectLabel>
                                  {cards.map((card) => (
                                    <SelectItem key={card.id} value={`card:${card.id}`}>
                                      {card.card_nickname || card.card_brand}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                              {banks.length > 0 && (
                                <SelectGroup>
                                  <SelectLabel>Bancos</SelectLabel>
                                  {banks.map((bank) => (
                                    <SelectItem key={bank.id} value={`bank:${bank.id}`}>
                                      {bank.nickname || bank.bank_name}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Supermercado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => {
                    const availableCategories =
                      transactionType === 'income' ? incomeCategories : expenseCategories;

                    return (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  availableCategories.length === 0
                                    ? 'Nenhuma categoria disponível'
                                    : 'Selecione uma categoria'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {transactionType === 'expense' && (
                  <div className="space-y-4 rounded-lg border border-border/50 bg-muted/30 p-4">
                    <FormField
                      control={form.control}
                      name="isInstallment"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <FormLabel className="text-base">Despesa parcelada?</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Ative para informar em quantas parcelas o valor será pago.
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={!!field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (checked) {
                                  if (!form.getValues('installments') || form.getValues('installments') === '1') {
                                    form.setValue('installments', '2');
                                  }
                                  if (
                                    !form.getValues('installmentsPaid') ||
                                    form.getValues('installmentsPaid') === '1'
                                  ) {
                                    form.setValue('installmentsPaid', '0');
                                  }
                                } else {
                                  form.setValue('installments', '1');
                                  form.setValue('installmentsPaid', getDefaultInstallmentsPaid());
                                }
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {isInstallment && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="installments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de parcelas</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  placeholder="Ex: 6"
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-sm text-muted-foreground">
                                O valor será distribuído igualmente entre as parcelas.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="installmentsPaid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parcelas já pagas</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  placeholder="Ex: 1"
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-sm text-muted-foreground">
                                Use este campo para controlar seu progresso de pagamento.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="transaction_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notas adicionais..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? 'Salvando...' : isEditing ? 'Atualizar Transação' : 'Salvar Transação'}
                </Button>

                {isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={resetForm}
                    disabled={isLoading}
                  >
                    Cancelar edição
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Transaction List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma transação ainda
                </div>
              ) : (
                transactions.map((transaction) => {
                  const installmentStatus = calculateInstallmentStatus(transaction);

                  return (
                    <div
                      key={transaction.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex flex-1 items-start gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            transaction.type === 'expense' ? 'bg-expense/10' : 'bg-income/10'
                          }`}
                        >
                          {transaction.type === 'expense' ? (
                            <TrendingDown className="h-5 w-5 text-expense" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-income" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.transaction_date)} •{' '}
                            {transaction.categories?.name || 'Sem categoria'}
                          </p>
                          {transaction.notes && (
                            <p className="text-xs text-muted-foreground">{transaction.notes}</p>
                          )}
                          {transaction.type === 'expense' && installmentStatus.totalInstallments > 1 && (
                            <p className="text-xs text-muted-foreground">
                              Parcelas {installmentStatus.paidInstallments}/
                              {installmentStatus.totalInstallments} • Restante{' '}
                              {formatCurrency(installmentStatus.remainingValue)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 md:justify-end">
                        <div
                          className={`font-semibold ${
                            transaction.type === 'expense' ? 'text-expense' : 'text-income'
                          }`}
                        >
                          {transaction.type === 'expense' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTransaction(transaction)}
                            aria-label="Editar transação"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            disabled={actionLoadingId === transaction.id}
                            aria-label="Excluir transação"
                          >
                            {actionLoadingId === transaction.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions;






















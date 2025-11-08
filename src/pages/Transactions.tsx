import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const transactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.string().min(1, 'Valor é obrigatório'),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  category_id: z.string().optional(),
  payment_method: z.string().optional(),
  transaction_date: z.string(),
  notes: z.string().optional(),
  isInstallment: z.boolean().optional(),
  installments: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const Transactions = () => {
  const { user } = useAuth();
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'debit',
      isInstallment: false,
      installments: '1',
    },
  });
  const transactionType = form.watch('type');
  const isInstallment = form.watch('isInstallment');

  useEffect(() => {
    if (user) {
      loadCategories();
      loadTransactions();
    }
  }, [user]);

  useEffect(() => {
    if (transactionType === 'income') {
      form.setValue('payment_method', undefined);
      form.setValue('isInstallment', false);
      form.setValue('installments', '1');
    } else if (!form.getValues('payment_method')) {
      form.setValue('payment_method', 'debit');
    }
  }, [transactionType, form]);

  const loadCategories = async () => {
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
  };

  const createDefaultExpenseCategories = async () => {
    const defaultCategories = [
      { name: 'Alimentação', icon: '🍔', color: '#EF4444', type: 'expense' },
      { name: 'Transporte', icon: '🚗', color: '#F59E0B', type: 'expense' },
      { name: 'Moradia', icon: '🏠', color: '#8B5CF6', type: 'expense' },
      { name: 'Saúde', icon: '💊', color: '#EC4899', type: 'expense' },
      { name: 'Educação', icon: '📚', color: '#3B82F6', type: 'expense' },
      { name: 'Lazer', icon: '🎮', color: '#10B981', type: 'expense' },
      { name: 'Compras', icon: '🛍️', color: '#F97316', type: 'expense' },
      { name: 'Outros', icon: '📦', color: '#6B7280', type: 'expense' },
    ];

    await supabase.from('categories').insert(
      defaultCategories.map(cat => ({
        ...cat,
        user_id: user?.id,
        is_default: true,
      }))
    );
  };

  const createDefaultIncomeCategories = async () => {
    const defaultIncomeCategories = [
      { name: 'Salário', icon: '💼', color: '#22c55e', type: 'income' },
      { name: 'Investimento', icon: '📈', color: '#0ea5e9', type: 'income' },
      { name: 'Outro', icon: '💡', color: '#a855f7', type: 'income' },
    ];

    await supabase.from('categories').insert(
      defaultIncomeCategories.map((cat) => ({
        ...cat,
        user_id: user?.id,
        is_default: true,
      })),
    );
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', user?.id)
      .order('transaction_date', { ascending: false });
    
    if (data) setTransactions(data);
  };

  const onSubmit = async (data: TransactionFormValues) => {
    setIsLoading(true);
    
    const isIncome = data.type === 'income';
    const totalInstallments =
      !isIncome && data.isInstallment ? Math.max(1, parseInt(data.installments || '1', 10)) : 1;

    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: user?.id,
        type: data.type,
        amount: parseFloat(data.amount),
        description: data.description,
        category_id: data.category_id || null,
        payment_method: isIncome ? null : data.payment_method || null,
        transaction_date: data.transaction_date,
        notes: data.notes || null,
        installments: totalInstallments,
        installment_number: 1,
      });

    setIsLoading(false);

    if (error) {
      toast.error('Erro ao criar transação');
      return;
    }

    toast.success('Transação criada com sucesso!');
    form.reset();
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
                  {isLoading ? 'Salvando...' : 'Salvar Transação'}
                </Button>
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
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'expense' ? 'bg-expense/10' : 'bg-income/10'
                      }`}>
                        {transaction.type === 'expense' ? (
                          <TrendingDown className="h-5 w-5 text-expense" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-income" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.transaction_date)}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      transaction.type === 'expense' ? 'text-expense' : 'text-income'
                    }`}>
                      {transaction.type === 'expense' ? '-' : '+'}
                      {formatCurrency(parseFloat(transaction.amount))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions;




















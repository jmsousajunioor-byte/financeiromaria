import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { calculateInstallmentStatus } from '@/lib/transaction-helpers';

type Category = Database['public']['Tables']['categories']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Category | null;
};

type FilterType = 'all' | 'expense' | 'income';

const getCurrentMonthRange = () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  return { start, end };
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

const Overview = () => {
  const { user } = useAuth();
  const { start, end } = getCurrentMonthRange();

  const [filters, setFilters] = useState({
    startDate: start,
    endDate: end,
    type: 'all' as FilterType,
  });
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);

      let query = supabase
        .from('transactions')
        .select('*, categories(*)')
        .eq('user_id', user.id);

      if (filters.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }

      if (filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      query = query.order('transaction_date', { ascending: false });

      const { data, error } = await query;
      setIsLoading(false);

      if (error) {
        toast.error('Erro ao carregar visão geral');
        return;
      }

      if (data) {
        setTransactions(data as TransactionRow[]);
      }
    };

    fetchData();
  }, [user, filters]);

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.totalIncome += transaction.amount;
        } else {
          acc.totalExpense += transaction.amount;
        }

        const status = calculateInstallmentStatus(transaction);

        if (transaction.type === 'expense' && status.totalInstallments > 1) {
          acc.openInstallments += 1;
          acc.pendingValue += status.remainingValue;
        }

        return acc;
      },
      { totalIncome: 0, totalExpense: 0, openInstallments: 0, pendingValue: 0 },
    );
  }, [transactions]);

  const handleFilterChange = (field: 'startDate' | 'endDate' | 'type', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: field === 'type' ? (value as FilterType) : value,
    }));
  };

  const resetFilters = () => {
    const range = getCurrentMonthRange();
    setFilters({ startDate: range.start, endDate: range.end, type: 'all' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Visão Geral</h1>
        <p className="mt-1 text-muted-foreground">
          Acompanhe rapidamente suas despesas e receitas, incluindo o status das parcelas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros rápidos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Data inicial</p>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(event) => handleFilterChange('startDate', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Data final</p>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(event) => handleFilterChange('endDate', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Tipo</p>
            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma opção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={resetFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(summary.totalIncome)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-expense">{formatCurrency(summary.totalExpense)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Parcelas em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.openInstallments}</p>
            <p className="text-sm text-muted-foreground">
              Valor pendente: {formatCurrency(summary.pendingValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico detalhado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Carregando dados...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhuma transação encontrada para o período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição & Categoria</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Valor total</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Restante</TableHead>
                    <TableHead>Local / Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const status = calculateInstallmentStatus(transaction);
                    const isExpense = transaction.type === 'expense';
                    const installmentLabel =
                      isExpense && status.totalInstallments > 1
                        ? `${status.paidInstallments}/${status.totalInstallments}`
                        : 'À vista';

                    const paidValue = status.installmentValue * status.paidInstallments;

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap text-sm font-medium">
                          {formatDate(transaction.transaction_date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={transaction.type === 'income' ? 'outline' : 'secondary'}
                            className={
                              transaction.type === 'income'
                                ? 'border-green-500 text-green-600'
                                : 'border-red-500 text-red-600'
                            }
                          >
                            {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[220px]">
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.categories?.name || 'Sem categoria'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{installmentLabel}</p>
                            {isExpense && status.totalInstallments > 1 && (
                              <p className="text-xs text-muted-foreground">
                                Faltam {status.remainingInstallments} parcelas
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>{formatCurrency(paidValue)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{formatCurrency(status.remainingValue)}</p>
                            <p className="text-xs text-muted-foreground">
                              {status.remainingInstallments === 0 ? 'Quitado' : 'Em aberto'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm text-muted-foreground">
                          {transaction.notes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;

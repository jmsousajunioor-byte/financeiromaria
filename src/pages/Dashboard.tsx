import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import FilterBar, { FilterState } from '@/components/dashboard/FilterBar';
import PieChartComponent from '@/components/dashboard/PieChartComponent';
import BarChartComponent from '@/components/dashboard/BarChartComponent';

type Category = Database['public']['Tables']['categories']['Row'];
type CardRow = Database['public']['Tables']['cards']['Row'];
type BankRow = Database['public']['Tables']['banks']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Category | null;
};

type PieChartDatum = { name: string; value: number; color: string };
type BarChartDatum = { name: string; despesas: number; receitas: number };

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalExpense: 0,
    totalIncome: 0,
    balance: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [pieChartData, setPieChartData] = useState<PieChartDatum[]>([]);
  const [barChartData, setBarChartData] = useState<BarChartDatum[]>([]);
  const [filters, setFilters] = useState<FilterState>({ dateRange: 'month' });

  const loadAllData = useCallback(async () => {
    if (!user) return;
    // Load categories
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user?.id);
    if (categoriesData) setCategories(categoriesData as Category[]);

    // Load cards
    const { data: cardsData } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user?.id);
    if (cardsData) setCards(cardsData as CardRow[]);

    // Load banks
    const { data: banksData } = await supabase
      .from('banks')
      .select('*')
      .eq('user_id', user?.id);
    if (banksData) setBanks(banksData as BankRow[]);
  }, [user]);

  const getDateRange = useCallback(() => {
    const today = new Date();
    let startDate: Date;

    switch (filters.dateRange) {
      case 'today':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last30':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case 'custom':
        if (filters.startDate && filters.endDate) {
          return {
            start: filters.startDate,
            end: filters.endDate,
          };
        }
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    return {
      start: startDate.toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    };
  }, [filters.dateRange, filters.endDate, filters.startDate]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    const dateRange = getDateRange();
    
    let query = supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', user?.id)
      .gte('transaction_date', dateRange.start)
      .lte('transaction_date', dateRange.end);

    // Apply filters
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.sourceId) {
      query = query.eq('source_id', filters.sourceId).eq('source_type', filters.sourceType);
    }

    const { data: transactions } = await query.order('transaction_date', { ascending: false });

    if (!transactions) return;

    const typedTransactions = transactions as TransactionRow[];
    setRecentTransactions(typedTransactions.slice(0, 5));

    // Calculate stats
    const expenses = typedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const income = typedTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      totalExpense: expenses,
      totalIncome: income,
      balance: income - expenses,
    });

    // Prepare pie chart data
    const categoryTotals = typedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc: Record<string, number>, t) => {
        const categoryName = t.categories?.name || 'Outros';
        acc[categoryName] = (acc[categoryName] || 0) + Number(t.amount);
        return acc;
      }, {});

    const pieData: PieChartDatum[] = Object.entries(categoryTotals).map(([category, value]) => ({
      name: category,
      value,
      color: `hsl(var(--${category === 'Outros' ? 'muted' : 'expense'}))`,
    }));
    setPieChartData(pieData);

    // Prepare bar chart data (group by month)
    const monthlyData = typedTransactions.reduce(
      (acc: Record<string, { despesas: number; receitas: number }>, t) => {
        const date = new Date(t.transaction_date);
        const month = date.toLocaleString('pt-BR', { month: 'short' });
        if (!acc[month]) {
          acc[month] = { despesas: 0, receitas: 0 };
        }
        if (t.type === 'expense') {
          acc[month].despesas += Number(t.amount);
        } else {
          acc[month].receitas += Number(t.amount);
        }
        return acc;
      },
      {},
    );

    const barData: BarChartDatum[] = Object.entries(monthlyData).map(([month, values]) => ({
      name: month,
      ...values,
    }));
    setBarChartData(barData);
  }, [filters.categoryId, filters.sourceId, filters.sourceType, getDateRange, user]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vindo de volta, {user?.user_metadata?.full_name || 'Usuário'}!
          </p>
        </div>
        <Button 
          onClick={() => navigate('/transactions')}
          className="bg-gradient-primary btn-prominent hover:opacity-90 transition-opacity gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* Filters */}
      <FilterBar
        onFilterChange={setFilters}
        categories={categories}
        cards={cards}
        banks={banks}
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
  <Card className="card-hover card-prominent bg-gradient-expense text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Total Gasto
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.totalExpense)}</div>
          </CardContent>
        </Card>

  <Card className="card-hover card-prominent bg-gradient-income text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Renda
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.totalIncome)}</div>
          </CardContent>
        </Card>

  <Card className="card-hover card-prominent bg-gradient-secondary text-white border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/90">
              Saldo
            </CardTitle>
            <Wallet className="h-5 w-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(stats.balance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PieChartComponent data={pieChartData} />
        <BarChartComponent data={barChartData} />
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma transação encontrada
              </p>
              <Button 
                onClick={() => navigate('/transactions')}
                variant="outline"
              >
                Adicionar primeira transação
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'expense' ? 'bg-expense/10' : 'bg-income/10'
                    }`}>
                      {transaction.type === 'expense' ? (
                        <TrendingDown className={`h-5 w-5 text-expense`} />
                      ) : (
                        <TrendingUp className={`h-5 w-5 text-income`} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description || 'Sem descrição'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.transaction_date)}
                        {transaction.categories && ` • ${transaction.categories.icon} ${transaction.categories.name}`}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${
                    transaction.type === 'expense' ? 'text-expense' : 'text-income'
                  }`}>
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatCurrency(Number(transaction.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;


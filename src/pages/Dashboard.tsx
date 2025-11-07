import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalExpense: 0,
    totalIncome: 0,
    balance: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    // Load transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user?.id)
      .order('transaction_date', { ascending: false })
      .limit(5);

    if (transactions) {
      setRecentTransactions(transactions);

      // Calculate stats
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setStats({
        totalExpense: expenses,
        totalIncome: income,
        balance: income - expenses,
      });
    }
  };

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
          className="bg-gradient-primary hover:opacity-90 transition-opacity gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Transação
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="card-hover bg-gradient-expense text-white border-0">
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

        <Card className="card-hover bg-gradient-income text-white border-0">
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

        <Card className="card-hover bg-gradient-secondary text-white border-0">
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
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${
                    transaction.type === 'expense' ? 'text-expense' : 'text-income'
                  }`}>
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatCurrency(parseFloat(transaction.amount))}
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

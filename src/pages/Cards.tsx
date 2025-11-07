import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import CardWizard from '@/components/cards/CardWizard';
import RealisticCard from '@/components/cards/RealisticCard';
import { toast } from 'sonner';
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

const Cards = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCards();
      loadBanks();
    }
  }, [user]);

  const loadCards = async () => {
    const { data } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Load transactions to calculate used limit
      const cardsWithUsage = await Promise.all(
        data.map(async (card) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user?.id)
            .eq('source_id', card.id)
            .eq('source_type', 'card')
            .eq('type', 'expense');
          
          const usedLimit = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          return { ...card, usedLimit };
        })
      );
      setCards(cardsWithUsage);
    }
  };

  const loadBanks = async () => {
    const { data } = await supabase
      .from('banks')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setBanks(data);
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

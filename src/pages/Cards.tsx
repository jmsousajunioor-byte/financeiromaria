import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

const Cards = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Cartões & Bancos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seus cartões e contas bancárias
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Em breve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A funcionalidade de gerenciamento de cartões e bancos estará disponível em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cards;

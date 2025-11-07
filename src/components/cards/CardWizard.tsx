import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { CreditCard, ChevronRight, ChevronLeft } from 'lucide-react';
import RealisticCard from './RealisticCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CardWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const gradientPresets = [
  { name: 'Roxo', start: '#8b5cf6', end: '#c084fc' },
  { name: 'Rosa', start: '#ec4899', end: '#f472b6' },
  { name: 'Azul', start: '#3b82f6', end: '#60a5fa' },
  { name: 'Verde', start: '#10b981', end: '#34d399' },
  { name: 'Laranja', start: '#f59e0b', end: '#fbbf24' },
  { name: 'Vermelho', start: '#ef4444', end: '#f87171' },
  { name: 'Teal', start: '#14b8a6', end: '#2dd4bf' },
  { name: 'Índigo', start: '#6366f1', end: '#818cf8' },
];

const CardWizard = ({ open, onOpenChange, onSuccess }: CardWizardProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [cardData, setCardData] = useState({
    card_number_last4: '',
    card_brand: 'visa' as 'visa' | 'mastercard' | 'amex' | 'elo',
    cardholder_name: '',
    card_nickname: '',
    card_gradient_start: gradientPresets[0].start,
    card_gradient_end: gradientPresets[0].end,
    credit_limit: '',
    expiration_month: '',
    expiration_year: '',
    billing_due_day: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const updateCardData = (updates: Partial<typeof cardData>) => {
    setCardData({ ...cardData, ...updates });
  };

  const nextStep = () => {
    if (step === 4 && !cardData.card_nickname) {
      toast.error('Nome do cartão é obrigatório');
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!cardData.card_nickname) {
      toast.error('Nome do cartão é obrigatório');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from('cards').insert({
      user_id: user?.id,
      card_number_last4: cardData.card_number_last4 || null,
      card_brand: cardData.card_brand,
      cardholder_name: cardData.cardholder_name || null,
      card_nickname: cardData.card_nickname,
      card_gradient_start: cardData.card_gradient_start,
      card_gradient_end: cardData.card_gradient_end,
      credit_limit: cardData.credit_limit ? parseFloat(cardData.credit_limit) : null,
      expiration_month: cardData.expiration_month ? parseInt(cardData.expiration_month) : null,
      expiration_year: cardData.expiration_year ? parseInt(cardData.expiration_year) : null,
      billing_due_day: cardData.billing_due_day ? parseInt(cardData.billing_due_day) : null,
    });

    setIsLoading(false);

    if (error) {
      toast.error('Erro ao criar cartão');
      return;
    }

    toast.success('Cartão criado com sucesso!');
    onSuccess();
    onOpenChange(false);
    setStep(1);
    setCardData({
      card_number_last4: '',
      card_brand: 'visa',
      cardholder_name: '',
      card_nickname: '',
      card_gradient_start: gradientPresets[0].start,
      card_gradient_end: gradientPresets[0].end,
      credit_limit: '',
      expiration_month: '',
      expiration_year: '',
      billing_due_day: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Adicionar Novo Cartão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Etapa {step} de {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Card Preview */}
          <div className="flex justify-center py-4">
            <RealisticCard
              nickname={cardData.card_nickname || 'Meu Cartão'}
              brand={cardData.card_brand}
              last4={cardData.card_number_last4}
              holderName={cardData.cardholder_name}
              gradientStart={cardData.card_gradient_start}
              gradientEnd={cardData.card_gradient_end}
            />
          </div>

          {/* Steps */}
          <div className="min-h-[200px]">
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2">Número do Cartão (Opcional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Digite os últimos 4 dígitos do seu cartão
                  </p>
                </div>
                <div>
                  <Label htmlFor="cardNumber">Últimos 4 dígitos</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234"
                    maxLength={4}
                    value={cardData.card_number_last4}
                    onChange={(e) => updateCardData({ card_number_last4: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2">Bandeira do Cartão</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione a bandeira do seu cartão
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(['visa', 'mastercard', 'amex', 'elo'] as const).map((brand) => (
                    <button
                      key={brand}
                      onClick={() => updateCardData({ card_brand: brand })}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        cardData.card_brand === brand
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="text-lg font-semibold capitalize">{brand}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2">Nome do Titular (Opcional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Como aparece no cartão
                  </p>
                </div>
                <div>
                  <Label htmlFor="holderName">Nome completo</Label>
                  <Input
                    id="holderName"
                    placeholder="JOÃO SILVA"
                    value={cardData.cardholder_name}
                    onChange={(e) => updateCardData({ cardholder_name: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2">Nome do Cartão</h3>
                  <p className="text-sm text-muted-foreground">
                    Como você quer identificar este cartão?
                  </p>
                </div>
                <div>
                  <Label htmlFor="nickname">Nome de identificação *</Label>
                  <Input
                    id="nickname"
                    placeholder="Ex: Santander Platinum, Nubank, etc"
                    value={cardData.card_nickname}
                    onChange={(e) => updateCardData({ card_nickname: e.target.value })}
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2">Cor do Cartão</h3>
                  <p className="text-sm text-muted-foreground">
                    Escolha um gradiente para seu cartão
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {gradientPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => updateCardData({ 
                        card_gradient_start: preset.start,
                        card_gradient_end: preset.end,
                      })}
                      className={`h-12 rounded-lg transition-all ${
                        cardData.card_gradient_start === preset.start
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${preset.start}, ${preset.end})`,
                      }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <Label htmlFor="limit">Limite (opcional)</Label>
                    <Input
                      id="limit"
                      type="number"
                      placeholder="5000.00"
                      value={cardData.credit_limit}
                      onChange={(e) => updateCardData({ credit_limit: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDay">Dia do vencimento</Label>
                    <Input
                      id="dueDay"
                      type="number"
                      placeholder="10"
                      min="1"
                      max="31"
                      value={cardData.billing_due_day}
                      onChange={(e) => updateCardData({ billing_due_day: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            {step < totalSteps ? (
              <Button onClick={nextStep}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="bg-gradient-primary"
              >
                {isLoading ? 'Salvando...' : 'Salvar Cartão'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardWizard;

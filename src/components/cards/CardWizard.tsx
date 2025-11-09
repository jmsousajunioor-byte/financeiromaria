import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CreditCard, ChevronRight, ChevronLeft } from 'lucide-react';
import RealisticCard from './RealisticCard';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CARD_COLOR_PRESETS } from '@/lib/card-presets';

interface CardWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const fallbackPreset = {
  id: 'default',
  label: 'Roxo Premium',
  gradientStart: '#4c1d95',
  gradientEnd: '#7c3aed',
  accent: '#facc15',
};
const defaultPreset = CARD_COLOR_PRESETS[0] ?? fallbackPreset;

const CardWizard = ({ open, onOpenChange, onSuccess }: CardWizardProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [cardData, setCardData] = useState({
    card_number_last4: '',
    card_brand: 'visa' as 'visa' | 'mastercard' | 'amex' | 'elo',
    cardholder_name: '',
    card_nickname: '',
    card_gradient_start: defaultPreset.gradientStart,
    card_gradient_end: defaultPreset.gradientEnd,
    card_color: defaultPreset.accent,
    credit_limit: '',
    expiration_month: '',
    expiration_year: '',
    billing_due_day: '',
  });
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id);
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 6;
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
      card_color: cardData.card_color,
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
      card_gradient_start: defaultPreset.gradientStart,
      card_gradient_end: defaultPreset.gradientEnd,
      card_color: defaultPreset.accent,
      credit_limit: '',
      expiration_month: '',
      expiration_year: '',
      billing_due_day: '',
    });
    setSelectedPresetId(defaultPreset.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Adicionar Novo Cartão
          </DialogTitle>
          <DialogDescription>
            Informe os dados principais do cartão para acompanhar limite e fatura.
          </DialogDescription>
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
              accentColor={cardData.card_color}
              creditLimit={
                cardData.credit_limit ? parseFloat(cardData.credit_limit) : undefined
              }
              expirationMonth={cardData.expiration_month ? Number(cardData.expiration_month) : undefined}
              expirationYear={cardData.expiration_year ? Number(cardData.expiration_year) : undefined}
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
                  <h3 className="text-lg font-semibold mb-2">Informações do Cartão</h3>
                  <p className="text-sm text-muted-foreground">
                    Esses dados ajudam a acompanhar o limite e o vencimento da fatura.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="limit">Limite (opcional)</Label>
                    <Input
                      id="limit"
                      type="number"
                      placeholder="5000"
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
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="expMonth">Mês de vencimento</Label>
                    <Input
                      id="expMonth"
                      type="number"
                      placeholder="05"
                      min="1"
                      max="12"
                      value={cardData.expiration_month}
                      onChange={(e) =>
                        updateCardData({ expiration_month: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="expYear">Ano de vencimento</Label>
                    <Input
                      id="expYear"
                      type="number"
                      placeholder="2028"
                      min="2024"
                      max="2099"
                      value={cardData.expiration_year}
                      onChange={(e) =>
                        updateCardData({ expiration_year: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2">Tema do Cartão</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione as cores reais do banco ou um gradiente premium.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {CARD_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        updateCardData({
                          card_gradient_start: preset.gradientStart,
                          card_gradient_end: preset.gradientEnd,
                          card_color: preset.accent,
                        });
                      }}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        selectedPresetId === preset.id
                          ? 'border-primary shadow-lg shadow-primary/30'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div
                        className="h-24 w-full rounded-xl shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${preset.gradientStart}, ${preset.gradientEnd})`,
                        }}
                      />
                      <p className="mt-2 text-sm font-semibold">{preset.label}</p>
                      {preset.bank ? (
                        <p className="text-xs text-muted-foreground">{preset.bank}</p>
                      ) : null}
                      {preset.description ? (
                        <p className="text-xs text-muted-foreground">{preset.description}</p>
                      ) : null}
                    </button>
                  ))}
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

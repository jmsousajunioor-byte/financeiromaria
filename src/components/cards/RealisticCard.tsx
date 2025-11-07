interface RealisticCardProps {
  nickname: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'elo';
  last4?: string;
  holderName?: string;
  gradientStart?: string;
  gradientEnd?: string;
  creditLimit?: number;
  usedLimit?: number;
}

const RealisticCard = ({
  nickname,
  brand,
  last4,
  holderName,
  gradientStart = '#8b5cf6',
  gradientEnd = '#c084fc',
  creditLimit,
  usedLimit,
}: RealisticCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const usagePercentage = creditLimit && usedLimit ? (usedLimit / creditLimit) * 100 : 0;

  return (
    <div className="perspective-1000">
      <div
        className="relative w-80 h-48 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-rotate-1"
        style={{
          background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
        }}
      >
        {/* Card shine effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-50" />
        
        {/* Card content */}
        <div className="relative h-full p-6 flex flex-col justify-between text-white">
          {/* Top section */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-75 mb-1">Cartão</p>
              <p className="font-bold text-lg">{nickname}</p>
            </div>
            <div className="h-10 w-14 bg-white/20 rounded backdrop-blur-sm flex items-center justify-center">
              <span className="text-xs font-bold uppercase">{brand}</span>
            </div>
          </div>

          {/* Middle section - Card number */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/60" />
            </div>
            {last4 && (
              <span className="text-lg font-mono tracking-wider">{last4}</span>
            )}
          </div>

          {/* Bottom section */}
          <div className="flex justify-between items-end">
            <div>
              {holderName ? (
                <>
                  <p className="text-xs opacity-75">Titular</p>
                  <p className="text-sm font-semibold tracking-wide">{holderName}</p>
                </>
              ) : (
                <p className="text-xs opacity-75">Nome não informado</p>
              )}
            </div>
            {creditLimit && (
              <div className="text-right">
                <p className="text-xs opacity-75">Limite</p>
                <p className="text-sm font-bold">{formatCurrency(creditLimit)}</p>
                {usedLimit !== undefined && (
                  <div className="mt-1 w-20 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chip effect */}
        <div className="absolute top-16 left-6 w-12 h-10 bg-gradient-to-br from-yellow-200 to-yellow-400 rounded opacity-80" />
      </div>
    </div>
  );
};

export default RealisticCard;

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Database } from '@/integrations/supabase/types';
import { getCategoryDisplay } from '@/lib/category-display';

type Category = Database['public']['Tables']['categories']['Row'];
type CardRow = Database['public']['Tables']['cards']['Row'];
type Bank = Database['public']['Tables']['banks']['Row'];

interface FilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  categories: Category[];
  cards: CardRow[];
  banks: Bank[];
}

export interface FilterState {
  dateRange: 'today' | 'week' | 'month' | 'last30' | 'custom';
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  sourceId?: string;
  sourceType?: 'card' | 'bank';
}

const FilterBar = ({ onFilterChange, categories, cards, banks }: FilterBarProps) => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'month',
  });

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterState = { dateRange: 'month' };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters = filters.categoryId || filters.sourceId || filters.dateRange === 'custom';

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="dateRange" className="mb-2 block text-sm font-medium">
              Período
            </Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) =>
                updateFilters({ dateRange: value as FilterState['dateRange'] })
              }
            >
              <SelectTrigger id="dateRange">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="last30">Últimos 30 Dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filters.dateRange === 'custom' && (
            <>
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="startDate" className="mb-2 block text-sm font-medium">
                  Data Inicial
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => updateFilters({ startDate: e.target.value })}
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label htmlFor="endDate" className="mb-2 block text-sm font-medium">
                  Data Final
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => updateFilters({ endDate: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="category" className="mb-2 block text-sm font-medium">
              Categoria
            </Label>
            <Select
              value={filters.categoryId || 'all'}
              onValueChange={(value) => updateFilters({ categoryId: value === 'all' ? undefined : value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((cat) => {
                  const display = getCategoryDisplay(cat);
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      {display.icon} {display.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="source" className="mb-2 block text-sm font-medium">
              Cartão/Banco
            </Label>
            <Select
              value={filters.sourceId || 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  updateFilters({ sourceId: undefined, sourceType: undefined });
                } else {
                  const [type, id] = value.split('-');
                  updateFilters({
                    sourceId: id,
                    sourceType: type as FilterState['sourceType'],
                  });
                }
              }}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={`card-${card.id}`}>
                    💳 {card.card_nickname}
                  </SelectItem>
                ))}
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={`bank-${bank.id}`}>
                    🏦 {bank.bank_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterBar;

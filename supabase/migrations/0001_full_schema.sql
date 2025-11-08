-- 0001_full_schema.sql
-- Full DB schema for glow-fin-app (profiles, banks, cards, categories, transactions)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, icon, color, type, is_default, created_at)
  VALUES
    (NEW.id, 'Alimentação', '🍔', '#EF4444', 'expense', true, now()),
    (NEW.id, 'Transporte', '🚗', '#F59E0B', 'expense', true, now()),
    (NEW.id, 'Moradia', '🏠', '#8B5CF6', 'expense', true, now()),
    (NEW.id, 'Saúde', '💊', '#EC4899', 'expense', true, now()),
    (NEW.id, 'Educação', '📚', '#3B82F6', 'expense', true, now()),
    (NEW.id, 'Lazer', '🎮', '#10B981', 'expense', true, now()),
    (NEW.id, 'Compras', '🛍️', '#F97316', 'expense', true, now()),
    (NEW.id, 'Outros', '📦', '#6B7280', 'expense', true, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tables
-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  phone text,
  cpf text,
  profile_photo text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_auth_users;
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_auth_users FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- banks
CREATE TABLE IF NOT EXISTS public.banks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  bank_name text NOT NULL,
  nickname text,
  bank_code text,
  account_type text,
  account_number text,
  branch_number text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.banks
  DROP CONSTRAINT IF EXISTS fk_banks_auth_users;
ALTER TABLE public.banks
  ADD CONSTRAINT fk_banks_auth_users FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- cards
CREATE TABLE IF NOT EXISTS public.cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  card_brand text NOT NULL,
  card_nickname text NOT NULL,
  cardholder_name text,
  card_number_last4 text,
  expiration_month integer,
  expiration_year integer,
  credit_limit numeric,
  billing_due_day integer,
  card_color text,
  card_gradient_start text,
  card_gradient_end text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cards
  DROP CONSTRAINT IF EXISTS fk_cards_auth_users;
ALTER TABLE public.cards
  ADD CONSTRAINT fk_cards_auth_users FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  icon text,
  color text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS fk_categories_auth_users;
ALTER TABLE public.categories
  ADD CONSTRAINT fk_categories_auth_users FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  transaction_date date NOT NULL,
  category_id uuid,
  payment_method text,
  installments integer DEFAULT 1,
  installment_number integer DEFAULT 1,
  source_type text,
  source_id uuid,
  destination_type text,
  destination_id uuid,
  transfer_type text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS fk_transactions_auth_users;
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_auth_users FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS fk_transactions_category;
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_banks_user_id ON public.banks(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON public.transactions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);

-- Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create default categories when a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_categories_for_user();

-- Row Level Security (RLS) and Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS banks_select_own ON public.banks;
CREATE POLICY banks_select_own ON public.banks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS banks_insert_own ON public.banks;
CREATE POLICY banks_insert_own ON public.banks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS banks_update_own ON public.banks;
CREATE POLICY banks_update_own ON public.banks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS banks_delete_own ON public.banks;
CREATE POLICY banks_delete_own ON public.banks FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cards_select_own ON public.cards;
CREATE POLICY cards_select_own ON public.cards FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS cards_insert_own ON public.cards;
CREATE POLICY cards_insert_own ON public.cards FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cards_update_own ON public.cards;
CREATE POLICY cards_update_own ON public.cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS cards_delete_own ON public.cards;
CREATE POLICY cards_delete_own ON public.cards FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS categories_select_own ON public.categories;
CREATE POLICY categories_select_own ON public.categories FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS categories_insert_own ON public.categories;
CREATE POLICY categories_insert_own ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS categories_update_own ON public.categories;
CREATE POLICY categories_update_own ON public.categories FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS categories_delete_own ON public.categories;
CREATE POLICY categories_delete_own ON public.categories FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
CREATE POLICY transactions_select_own ON public.transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS transactions_insert_own ON public.transactions;
CREATE POLICY transactions_insert_own ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS transactions_update_own ON public.transactions;
CREATE POLICY transactions_update_own ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS transactions_delete_own ON public.transactions;
CREATE POLICY transactions_delete_own ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- NOTE: Storage buckets creation handled separately (create via Supabase UI or storage RPC if available).


-- Add default categories for existing users who don't have any
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT u.id 
    FROM auth.users u
    LEFT JOIN public.categories c ON c.user_id = u.id
    WHERE c.id IS NULL
  LOOP
    INSERT INTO public.categories (user_id, name, icon, color, type, is_default)
    VALUES
      (user_record.id, 'Alimentação', '🍔', '#EF4444', 'expense', true),
      (user_record.id, 'Transporte', '🚗', '#F59E0B', 'expense', true),
      (user_record.id, 'Moradia', '🏠', '#8B5CF6', 'expense', true),
      (user_record.id, 'Saúde', '💊', '#EC4899', 'expense', true),
      (user_record.id, 'Educação', '📚', '#3B82F6', 'expense', true),
      (user_record.id, 'Lazer', '🎮', '#10B981', 'expense', true),
      (user_record.id, 'Compras', '🛍️', '#F97316', 'expense', true),
      (user_record.id, 'Outros', '📦', '#6B7280', 'expense', true);
  END LOOP;
END $$;
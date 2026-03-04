
-- Add teacher_name and sponsor to circles
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS teacher_name text;
ALTER TABLE public.circles ADD COLUMN IF NOT EXISTS sponsor text;

-- Add completion tracking to maarij_data
ALTER TABLE public.maarij_data ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.maarij_data ADD COLUMN IF NOT EXISTS completed_at date;
ALTER TABLE public.maarij_data ADD COLUMN IF NOT EXISTS started_at date DEFAULT CURRENT_DATE;

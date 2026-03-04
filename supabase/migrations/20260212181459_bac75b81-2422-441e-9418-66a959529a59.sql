
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');

-- Create enum for student track
CREATE TYPE public.student_track AS ENUM ('تمهيدي', 'فضي', 'ذهبي');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('حاضر', 'غائب', 'غائب بعذر', 'متأخر');

-- Create enum for level status
CREATE TYPE public.level_status AS ENUM ('متقدم', 'متأخر', 'منضبط');

-- Circles table
CREATE TABLE public.circles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  track public.student_track NOT NULL DEFAULT 'تمهيدي',
  level INTEGER NOT NULL DEFAULT 1,
  age INTEGER,
  parent_phone TEXT,
  circle_id UUID REFERENCES public.circles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily evaluations table
CREATE TABLE public.daily_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 18),
  day TEXT NOT NULL CHECK (day IN ('الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء')),
  attendance public.attendance_status NOT NULL DEFAULT 'حاضر',
  uniform_file_score INTEGER NOT NULL DEFAULT 0 CHECK (uniform_file_score >= 0 AND uniform_file_score <= 3),
  memorization INTEGER NOT NULL DEFAULT 0 CHECK (memorization >= 0 AND memorization <= 5),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0 AND revision <= 5),
  maarij_points INTEGER NOT NULL DEFAULT 0 CHECK (maarij_points >= 0 AND maarij_points <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, week, day)
);

-- Distinguished circle scores (per course, 6 courses)
CREATE TABLE public.distinguished_circle_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  course INTEGER NOT NULL CHECK (course >= 1 AND course <= 6),
  diamond_necklace NUMERIC(5,2) NOT NULL DEFAULT 0,
  bee_buzz NUMERIC(5,2) NOT NULL DEFAULT 0,
  morals NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(circle_id, course)
);

-- Ma'arij data & rewards
CREATE TABLE public.maarij_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  rewards INTEGER NOT NULL DEFAULT 0,
  level_status public.level_status NOT NULL DEFAULT 'منضبط',
  points INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Academic calendar
CREATE TABLE public.academic_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 19),
  event_name TEXT NOT NULL,
  event_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distinguished_circle_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maarij_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for circles
CREATE POLICY "Authenticated users can view circles"
  ON public.circles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage circles"
  ON public.circles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for students
CREATE POLICY "Admins can view all students"
  ON public.students FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view their circle students"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = students.circle_id
      AND circles.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all students"
  ON public.students FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for daily_evaluations
CREATE POLICY "Admins can view all evaluations"
  ON public.daily_evaluations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view their circle evaluations"
  ON public.daily_evaluations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = daily_evaluations.circle_id
      AND circles.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage their circle evaluations"
  ON public.daily_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = daily_evaluations.circle_id
      AND circles.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update their circle evaluations"
  ON public.daily_evaluations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = daily_evaluations.circle_id
      AND circles.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all evaluations"
  ON public.daily_evaluations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for distinguished_circle_scores
CREATE POLICY "Authenticated users can view distinguished scores"
  ON public.distinguished_circle_scores FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage distinguished scores"
  ON public.distinguished_circle_scores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for maarij_data
CREATE POLICY "Admins can view all maarij data"
  ON public.maarij_data FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view their students maarij data"
  ON public.maarij_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      JOIN public.circles ON circles.id = students.circle_id
      WHERE students.id = maarij_data.student_id
      AND circles.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all maarij data"
  ON public.maarij_data FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for academic_calendar
CREATE POLICY "Authenticated users can view calendar"
  ON public.academic_calendar FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage calendar"
  ON public.academic_calendar FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_daily_evaluations_updated_at
  BEFORE UPDATE ON public.daily_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_distinguished_circle_scores_updated_at
  BEFORE UPDATE ON public.distinguished_circle_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

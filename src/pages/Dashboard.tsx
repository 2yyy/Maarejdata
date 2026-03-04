import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CircleDot, BookOpen, Trophy, Star,ClipboardCheck,Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ students: 0, circles: 0, evaluations: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [studentsRes, circlesRes, evalsRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('circles').select('id', { count: 'exact', head: true }),
        supabase.from('daily_evaluations').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        students: studentsRes.count ?? 0,
        circles: circlesRes.count ?? 0,
        evaluations: evalsRes.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const quickActions = [
    { label: 'بيانات المعارج', icon: Star, path: '/maarij-data', color: 'bg-success' }, 
    { label: 'التقويم', icon: BookOpen, path: '/Calendar', color: 'bg-indigo-600' },
    { label: 'التقييم اليومي', icon: ClipboardCheck, path: '/daily-evaluation', color: 'bg-orange-600' },
    { label: 'الحلقة المتميزة', icon: Trophy, path: '/distinguished-circle', color: 'bg-sky-900' },
    { label: 'الحلقات', icon: CircleDot, path: '/circles', color: 'bg-fuchsia-600' },
    { label: 'الطلاب', icon: Users, path: '/students', color: 'bg-zinc-900' },
    { label: 'وسام ماهر', icon: Award, path: '/wissam-maher', color: 'bg-emerald-700' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold">
          {role === 'admin' ? 'لوحة تحكم المشرف' : 'لوحة تحكم المعلم'}
        </h1>
        <p className="text-muted-foreground mt-1">مرحباً بك في نظام المعارج</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.students}</p>
            <p className="text-xs text-muted-foreground">طالب</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CircleDot className="h-6 w-6 mx-auto text-accent mb-1" />
            <p className="text-2xl font-bold">{stats.circles}</p>
            <p className="text-xs text-muted-foreground">حلقة</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">الوصول السريع</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.path}
                className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]"
                onClick={() => navigate(action.path)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`${action.color} text-primary-foreground p-2.5 rounded-xl`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-sm">{action.label}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

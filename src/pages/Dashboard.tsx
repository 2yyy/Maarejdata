import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CircleDot, BookOpen, Trophy, Star, ClipboardCheck, Award, Activity, Building2, ArrowRight, Calendar, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { role, circleId, setActiveComplexId } = useAuth();
  const navigate = useNavigate();
  
  const [adminStats, setAdminStats] = useState({ students: 0, complexesCount: 0 });
  const [adminComplexes, setAdminComplexes] = useState<any[]>([]); 
  const [selectedAdminCircle, setSelectedAdminCircle] = useState<any>(null); 
  
  const [teacherStats, setTeacherStats] = useState({ 
    count: 0, 
    totalHifz: 0, 
    totalReview: 0, 
    circleName: '',
    topStudents: [] as any[] 
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (role === 'admin') {
        const [studentsRes, complexesCountRes, allComplexesRes] = await Promise.all([
          supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'نشط'),
          supabase.from('complexes').select('id', { count: 'exact', head: true }),
          supabase.from('complexes').select('id, name').order('name', { ascending: true }),
        ]);
        setAdminStats({
          students: studentsRes.count ?? 0,
          complexesCount: complexesCountRes.count ?? 0,
        });
        setAdminComplexes(allComplexesRes.data || []);
      } else if (role === 'teacher' && circleId) {
        const { data: circleData } = await supabase.from('circles').select('name').eq('id', circleId).maybeSingle();
        const { data: circleStudents } = await supabase.from('students').select('id, name').eq('circle_id', circleId).eq('status', 'نشط');

        let top = [];
        let totalHifzCircle = 0;
        let totalReviewCircle = 0;

        if (circleStudents && circleStudents.length > 0) {
          const studentIds = circleStudents.map(s => s.id);
          
          const { data: progress } = await supabase.from('maarij_data').select('student_id, hifz_pages, review_pages').in('student_id', studentIds);

          const studentStats = circleStudents.map(s => {
            const myProgress = (progress || []).filter(p => p.student_id === s.id);
            const hifz = myProgress.reduce((sum, p) => sum + (Number(p.hifz_pages) || 0), 0);
            const review = myProgress.reduce((sum, p) => sum + (Number(p.review_pages) || 0), 0);
            const total = hifz + review; 
            
            totalHifzCircle += hifz;
            totalReviewCircle += review;

            return { ...s, hifz, review, total };
          });

          top = studentStats.sort((a, b) => b.total - a.total).slice(0, 3);
        }

        setTeacherStats({ 
          count: circleStudents?.length ?? 0, 
          totalHifz: totalHifzCircle, 
          totalReview: totalReviewCircle,
          circleName: circleData?.name || 'غير محددة',
          topStudents: top 
        });
      }
    };
    
    fetchDashboardData();
  }, [role, circleId]);

  const quickActions = [
    { label: 'بيانات معارج', icon: Star, path: '/maarij-data', color: 'bg-emerald-600' }, 
    { label: 'التقييم اليومي', icon: ClipboardCheck, path: '/daily-evaluation', color: 'bg-orange-600' },
    { label: 'الحلقة المتميزة', icon: Trophy, path: '/distinguished-circle', color: 'bg-sky-900' },
    { label: 'الحلقات', icon: CircleDot, path: '/circles', color: 'bg-fuchsia-600' },
    { label: 'الطلاب', icon: Users, path: '/students', color: 'bg-zinc-900' },
    { label: 'وسام ماهر', icon: Award, path: '/wissam-maher', color: 'bg-emerald-700' },
    { label: 'الإحصائيات', icon: Activity, path: '/monitoring', color: 'bg-rose-600' },
  ];

  const getAdminScopedActions = () => {
    return quickActions.map(action => {
      if (action.path === '/maarij-data') return { ...action, label: 'بيانات معارج المجمع' };
      if (action.path === '/circles') return { ...action, label: 'حلقات المجمع' };
      return action;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* ----------------- واجهة المشرف العام (المركزية) ----------------- */}
      {role === 'admin' && !selectedAdminCircle && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800">لوحة تحكم الشرف العام</h1>
            <p className="text-muted-foreground mt-1">نظرة شاملة على جميع مجمعات وحلقات البرنامج</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{adminStats.students}</p>
                <p className="text-xs text-muted-foreground font-bold mt-1">إجمالي الطلاب (النشطين)</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <Building2 className="h-6 w-6 mx-auto text-accent mb-1" />
                <p className="text-2xl font-bold">{adminStats.complexesCount}</p>
                <p className="text-xs text-muted-foreground font-bold mt-1">المجمعات المشاركة</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-400" /> الإدارة الشاملة
            </h2>
            
            <div className="grid gap-3">
              <Card 
                className="bg-gradient-to-l from-primary/10 to-transparent border-primary/20 cursor-pointer hover:bg-primary/10 transition-all shadow-sm active:scale-[0.99]"
                onClick={() => navigate('/maarij-data')}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-primary text-white rounded-xl shadow-md"><Star className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-bold text-md text-primary">سجلات معارج الشاملة</h3>
                      <p className="text-[10px] font-semibold text-primary/70">الوصول لبيانات جميع الطلاب في كل المجمعات</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-l from-amber-500/10 to-transparent border-amber-500/20 cursor-pointer hover:bg-amber-500/10 transition-all shadow-sm active:scale-[0.99]"
                onClick={() => navigate('/calendar')}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md"><Calendar className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-bold text-md text-amber-700">التقويم الأكاديمي المركزي</h3>
                      <p className="text-[10px] font-semibold text-amber-600/70">إدارة الأسابيع وتواريخ الفصول الدراسية</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-bold mb-3 text-slate-800">المجمعات</h2>
            <div className="grid grid-cols-2 gap-3">
              {adminComplexes.map(c => (
                <Card 
                  key={c.id} 
                  className="cursor-pointer hover:border-primary hover:shadow-md transition-all active:scale-95" 
                  onClick={() => {
                    setSelectedAdminCircle(c);
                    setActiveComplexId(c.id); 
                  }}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg"><Building2 className="h-4 w-4 text-slate-600" /></div>
                    <span className="font-bold text-[13px] text-slate-700">{c.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- واجهة المشرف العام (داخل المجمع المحدد) ----------------- */}
      {role === 'admin' && selectedAdminCircle && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-primary">مجمع: {selectedAdminCircle.name}</h1>
              <p className="text-muted-foreground mt-1 text-sm font-bold">صلاحيات إدارة المجمع</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setSelectedAdminCircle(null);
              setActiveComplexId(null);
            }} className="gap-2">
              الرجوع <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold mb-3 mt-2">الوصول السريع للمجمع</h2>
            <div className="grid grid-cols-2 gap-3">
              {getAdminScopedActions().map((action) => {
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
      )}

      {/* ----------------- واجهة المعلم (اللايف بورد) ----------------- */}
      {role === 'teacher' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-800">
              حلقة {teacherStats.circleName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-bold">مرحباً بك</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <Users className="h-6 w-6 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold text-primary">{teacherStats.count}</p>
                <p className="text-xs font-bold text-primary/70">الطلاب النشطين</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <BookOpen className="h-6 w-6 mx-auto text-orange-600 mb-1" />
                <p className="text-2xl font-bold text-orange-600">{teacherStats.totalHifz + teacherStats.totalReview}</p>
                <p className="text-[10px] font-bold text-orange-600/70">إجمالي (حفظ + مراجعة)</p>
              </CardContent>
            </Card>
          </div>

          {teacherStats.topStudents.length > 0 && (
            <div className="animate-in slide-in-from-bottom-4">
              <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                <Trophy className="h-5 w-5 text-yellow-500" /> طلاب الحلقة (الأعلى إنجازاً)
              </h2>
              <div className="space-y-2">
                {teacherStats.topStudents.map((student, index) => (
                  <Card key={student.id} className="border shadow-sm overflow-hidden">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-sm">
                          {index + 1}
                        </div>
                        <span className="font-bold text-sm text-slate-700">{student.name}</span>
                      </div>
                      <div className="text-[14px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
                        {student.total}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="font-display text-lg font-semibold mb-3 mt-2">الوصول السريع</h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]" onClick={() => navigate('/calendar')}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="bg-amber-500 text-white p-2.5 rounded-xl">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-sm">التقويم</span>
                </CardContent>
              </Card>

              {quickActions
                
                .filter(action => ['/monitoring', '/daily-evaluation', '/circles'].includes(action.path))
                .map((action) => {
                  const Icon = action.icon;
                  const displayLabel = action.path === '/circles' ? 'بيانات الحلقة' : action.label;
                  return (
                    <Card key={action.path} className="cursor-pointer hover:shadow-lg transition-shadow active:scale-[0.98]" onClick={() => navigate(action.path)}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`${action.color} text-primary-foreground p-2.5 rounded-xl`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-medium text-sm">{displayLabel}</span>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; 
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Target, Calendar, CheckCircle2, Trophy, Edit3, Save, Medal, Clock, XCircle, Sparkles, Flag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';

interface StudentReport {
  id: string;
  name: string;
  circle_id: string;
  total_present: number;
  total_late: number;
  total_excused: number;
  total_unexcused: number;
  total_maarij: number;
  goal_requirements: string; 
  goal_end_text: string;      
  goal_start_date: string;
  goal_end_date: string;
  is_goal_achieved: boolean;
  rank: number; 
}

interface Circle { id: string; name: string; }

export default function WissamMaher() {
  const { role, activeComplexId } = useAuth(); 
  const { toast } = useToast();
  const [course, setCourse] = useState('1');
  const [circleId, setCircleId] = useState('all');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false); 

  useEffect(() => {
    
    let query = supabase.from('circles').select('id, name');
    if (activeComplexId) {
      query = query.eq('complex_id', activeComplexId);
    }
    
    query.then(({ data }) => {
      if (data) setCircles(data);
    });
  }, [activeComplexId]);

  const fetchReports = async () => {
    const startWeek = (parseInt(course) - 1) * 4 + 1;
    const endWeek = startWeek + 3;

    
    let studentsQuery = supabase.from('students').select('id, name, circle_id, goal_requirements, goal_end_text, goal_start_date, goal_end_date, is_goal_achieved');
    if (activeComplexId) {
      studentsQuery = studentsQuery.eq('complex_id', activeComplexId);
    }
    
    const { data: students } = await studentsQuery;
    
    if (!students?.length) { setReports([]); return; }

    const { data: evals } = await supabase
      .from('daily_evaluations')
      .select('*')
      .gte('week', startWeek)
      .lte('week', endWeek);

    const evalMap: Record<string, any[]> = {};
    evals?.forEach(e => {
      if (!evalMap[e.student_id]) evalMap[e.student_id] = [];
      evalMap[e.student_id].push(e);
    });

    let allRows: StudentReport[] = (students as any[]).map(s => {
      const studentEvals = evalMap[s.id] || [];
      return {
        id: s.id,
        name: s.name,
        circle_id: s.circle_id || '',
        total_present: studentEvals.filter(e => e.attendance === 'حاضر').length,
        total_late: studentEvals.filter(e => e.attendance === 'متأخر').length,
        total_excused: studentEvals.filter(e => e.attendance === 'غائب بعذر').length,
        total_unexcused: studentEvals.filter(e => e.attendance === 'غائب').length,
        total_maarij: studentEvals.reduce((sum, e) => sum + (e.maarij_points ?? 0), 0),
        goal_requirements: s.goal_requirements || '',
        goal_end_text: s.goal_end_text || '',
        goal_start_date: s.goal_start_date || '',
        goal_end_date: s.goal_end_date || '',
        is_goal_achieved: s.is_goal_achieved || false,
        rank: 0, 
      };
    });

    const finalData: StudentReport[] = [];
    const targetCircles = circleId === 'all' ? circles.map(c => c.id) : [circleId];

    targetCircles.forEach(cId => {
      const circleStudents = allRows
        .filter(r => r.circle_id === cId)
        .sort((a, b) => {
          
          if (a.is_goal_achieved !== b.is_goal_achieved) return a.is_goal_achieved ? -1 : 1;
          if (a.total_unexcused !== b.total_unexcused) return a.total_unexcused - b.total_unexcused;
          return b.total_maarij - a.total_maarij;
        });

      circleStudents.forEach((student, index) => {
        if (index < 3) student.rank = index + 1;
        finalData.push(student);
      });
    });

    setReports(finalData.sort((a, b) => {
      if (a.is_goal_achieved !== b.is_goal_achieved) return a.is_goal_achieved ? -1 : 1;
      if (a.total_unexcused !== b.total_unexcused) return a.total_unexcused - b.total_unexcused;
      return b.total_maarij - a.total_maarij;
    }));
  };

  useEffect(() => { fetchReports(); }, [circleId, course, circles, activeComplexId]); 

  const handleUpdateGoal = async () => {
    if (!editingStudent) return;
    const { error } = await supabase
      .from('students')
      .update({
        ["goal_requirements"]: editingStudent.goal_requirements,
        ["goal_end_text"]: editingStudent.goal_end_text,
        ["goal_start_date"]: editingStudent.goal_start_date,
        ["goal_end_date"]: editingStudent.goal_end_date,
        ["is_goal_achieved"]: editingStudent.is_goal_achieved
      } as any)
      .eq('id', editingStudent.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل الحفظ", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ", description: "تم التحديث بنجاح" });
      setIsDialogOpen(false); 
      setEditingStudent(null);
      fetchReports();
    }
  };

  const getRankBadge = (rank: number) => {
    switch(rank) {
      case 1: return <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1"><Trophy className="h-3 w-3" /> الأول</Badge>;
      case 2: return <Badge className="bg-slate-400 hover:bg-slate-500 gap-1"><Medal className="h-3 w-3" /> الثاني</Badge>;
      case 3: return <Badge className="bg-orange-400 hover:bg-orange-500 gap-1"><Medal className="h-3 w-3" /> الثالث</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 p-4 pb-20 animate-fade-in" dir="rtl">
      {/* */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border shadow-sm">
        <h1 className="font-display text-xl font-bold flex items-center gap-2 text-primary">
          <Award className="h-6 w-6 text-accent" /> وسام ماهر
        </h1>
        <div className="flex gap-2">
          <Select value={course} onValueChange={setCourse}>
            <SelectTrigger className="w-32"><SelectValue placeholder="الدورة" /></SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>الدورة {n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={circleId} onValueChange={setCircleId}>
            <SelectTrigger className="w-32"><SelectValue placeholder="الحلقة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحلقات</SelectItem>
              {circles.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {reports.map(r => (
          <Card key={r.id} className={`overflow-hidden transition-all ${r.rank === 1 ? 'border-yellow-500/50 shadow-md ring-1 ring-yellow-200' : ''}`}>
            <CardContent className="p-0">
              <div className="p-4 flex flex-col md:flex-row justify-between gap-4 border-b">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${r.rank === 1 ? 'bg-yellow-100' : 'bg-muted'}`}>
                      <Award className={`h-5 w-5 ${r.rank === 1 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{r.name}</span>
                        {getRankBadge(r.rank)}
                        {r.is_goal_achieved && (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1 animate-pulse">
                            <Sparkles className="h-3 w-3" /> مُنجز
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Flag className="h-3.5 w-3.5 text-accent" />
                        <span className="text-xs text-muted-foreground">نهاية الهدف: <span className="text-foreground font-medium">{r.goal_end_text || 'لم يحدد'}</span></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="text-center border-l border-r px-5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">نقاط معارج</p>
                    <p className={`text-2xl font-black ${r.rank === 1 ? 'text-yellow-600' : 'text-primary'}`}>{r.total_maarij}</p>
                  </div>

                  <Dialog open={isDialogOpen && editingStudent?.id === r.id} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingStudent(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => {
                        setEditingStudent(r);
                        setIsDialogOpen(true);
                      }}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="text-center" dir="rtl">
<DialogHeader>
  <DialogTitle className="text-center">تعديل هدف: {r.name}</DialogTitle>
</DialogHeader>
<div className="grid gap-4 py-4">
  {/* */}
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2 text-center">
      <Label className="block">بداية الهدف</Label>
      <Input 
        value={editingStudent?.goal_requirements || ''} 
        onChange={e => setEditingStudent(prev => prev ? {...prev, goal_requirements: e.target.value} : null)} 
      />
    </div>
    <div className="space-y-2 text-center">
      <Label className="block">نهاية الهدف</Label>
      <Input 
        value={editingStudent?.goal_end_text || ''} 
        onChange={e => setEditingStudent(prev => prev ? {...prev, goal_end_text: e.target.value} : null)} 
      />
    </div>
  </div>

  {/* */}
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2 text-center">
      <Label className="block">تاريخ البداية</Label>
      <Input 
        type="date" 
        value={editingStudent?.goal_start_date || ''} 
        onChange={e => setEditingStudent(prev => prev ? {...prev, goal_start_date: e.target.value} : null)} 
      />
    </div>
    <div className="space-y-2 text-center">
      <Label className="block">تاريخ النهاية</Label>
      <Input 
        type="date" 
        value={editingStudent?.goal_end_date || ''} 
        onChange={e => setEditingStudent(prev => prev ? {...prev, goal_end_date: e.target.value} : null)} 
      />
    </div>
  </div>

  {/* */}
  <div className="flex items-center gap-2 pt-2 justify-center">
    <input 
      type="checkbox" 
      className="h-4 w-4 accent-primary" 
      checked={editingStudent?.is_goal_achieved || false} 
      onChange={e => setEditingStudent(prev => prev ? {...prev, is_goal_achieved: e.target.checked} : null)} 
    />
    <Label>تم إنجاز الهدف</Label>
  </div>
</div>
<DialogFooter>
                        <Button onClick={handleUpdateGoal} className="w-full font-bold"><Save className="ml-2 h-4 w-4" /> حفظ التعديلات</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* */}
              <div className="p-3 bg-muted/20 grid grid-cols-4 gap-2">
                <div className="bg-green-50/50 border border-green-100 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-green-600 font-bold mb-0.5">حضور</p>
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-bold text-green-700">{r.total_present}</span>
                  </div>
                </div>
                <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-yellow-600 font-bold mb-0.5">تأخر</p>
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3 text-yellow-500" />
                    <span className="text-sm font-bold text-yellow-700">{r.total_late}</span>
                  </div>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-blue-600 font-bold mb-0.5">عذر</p>
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    <span className="text-sm font-bold text-blue-700">{r.total_excused}</span>
                  </div>
                </div>
                <div className="bg-red-50/50 border border-red-100 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-red-600 font-bold mb-0.5">غياب</p>
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-sm font-bold text-red-700">{r.total_unexcused}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
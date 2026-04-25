import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, CircleDot, Trash2, Pencil, ArrowRightLeft, Info, Building2, ArrowRight } from 'lucide-react'; 
import { useNavigate } from 'react-router-dom';

interface Circle {
  id: string;
  name: string;
  teacher_id: string | null;
  teacher_name: string | null;
  sponsor: string | null;
  complex_id?: string | null; // إضافة complex_id للحلقة
  complex_name?: string; // اسم المجمع لغرض العرض
  students?: { 
    id: string; 
    name: string; 
    track: string; 
    level: number; 
    age: number | null; 
    birth_date: string | null; 
    parent_phone: string | null; 
    study_stage: string | null; 
  }[];
}

interface Complex {
  id: string;
  name: string;
}

export default function Circles() {
  const { role, circleId, activeComplexId } = useAuth(); 
  const { toast } = useToast();
  const navigate = useNavigate();

  const [circles, setCircles] = useState<Circle[]>([]);
  const [allCircles, setAllCircles] = useState<{ id: string; name: string, complex_id?: string }[]>([]);
  const [complexes, setComplexes] = useState<Complex[]>([]); // حالة المجمعات
  const [activeComplexName, setActiveComplexName] = useState('');
  
  const [filterComplex, setFilterComplex] = useState<string>('all'); // فلتر المجمع

  const [showAdd, setShowAdd] = useState(false);
  const [editCircle, setEditCircle] = useState<Circle | null>(null);
  const [transferStudent, setTransferStudent] = useState<{ studentId: string; studentName: string; currentCircleId: string } | null>(null);
  const [targetCircleId, setTargetCircleId] = useState('');
  
  // حفظ المجمع المختار في نافذة الإضافة
  const [formComplexId, setFormComplexId] = useState<string>('');
  const [form, setForm] = useState({ name: '', teacher_name: '', sponsor: '' });
  
  const [loading, setLoading] = useState(false);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<any>(null);

  const calcAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fetchCircles = async () => {
    if (role === 'teacher' && !circleId) {
      setCircles([]);
      return;
    }

    let query = supabase.from('circles').select('*, students(id, name, track, level, age, birth_date, parent_phone, study_stage)');
    let complexesQuery = supabase.from('complexes').select('id, name');

    if (role === 'teacher') {
      query = query.eq('id', circleId);
    } else if (role === 'admin' && activeComplexId) {
      query = query.eq('complex_id', activeComplexId);
    }

    const [ { data: circlesData, error }, { data: compData } ] = await Promise.all([
      query,
      complexesQuery
    ]);
    
    if (error) {
      console.error("خطأ في جلب الحلقات:", error);
      return;
    }

    if (compData) {
      setComplexes(compData);
      if (activeComplexId) {
        setActiveComplexName(compData.find(c => c.id === activeComplexId)?.name || '');
      }
    }

    if (circlesData) {
      const enrichedCircles = circlesData.map((c: any) => ({
        ...c,
        complex_name: compData?.find(comp => comp.id === c.complex_id)?.name || 'غير محدد'
      }));
      setCircles(enrichedCircles as Circle[]);
      setAllCircles(enrichedCircles.map((c: any) => ({ id: c.id, name: c.name, complex_id: c.complex_id })));
    }
  };

  useEffect(() => { fetchCircles(); }, [role, circleId, activeComplexId]); 

  // فلترة الحلقات بناءً على المجمع المختار في الشاشة الرئيسية
  const filteredCircles = circles.filter(c => {
    if (filterComplex !== 'all' && c.complex_id !== filterComplex) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    const targetComplex = activeComplexId || formComplexId;
    
    if (role === 'admin' && !targetComplex) {
      toast({ title: 'تنبيه', description: 'الرجاء اختيار المجمع', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('circles').insert({
      name: form.name.trim(),
      teacher_name: form.teacher_name.trim() || null,
      sponsor: form.sponsor.trim() || null,
      complex_id: targetComplex 
    });
    
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تمت إضافة الحلقة' });
      setShowAdd(false);
      setForm({ name: '', teacher_name: '', sponsor: '' });
      setFormComplexId('');
      fetchCircles();
    }
    setLoading(false);
  };

  const handleEdit = async () => {
    if (!editCircle) return;
    setLoading(true);
    const { error } = await supabase.from('circles').update({
      name: form.name.trim(),
      teacher_name: form.teacher_name.trim() || null,
      sponsor: form.sponsor.trim() || null,
    }).eq('id', editCircle.id);
    
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث الحلقة' });
      setEditCircle(null);
      fetchCircles();
    }
    setLoading(false);
  };

  const handleDeleteCircle = async (id: string) => {
    const { error } = await supabase.from('circles').delete().eq('id', id);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف الحلقة' });
      fetchCircles();
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    const { error } = await supabase.from('students').update({ circle_id: null }).eq('id', studentId);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم إزالة الطالب من الحلقة' });
      fetchCircles();
    }
  };

  const handleTransfer = async () => {
    if (!transferStudent || !targetCircleId) return;
    setLoading(true);
    const { error } = await supabase.from('students').update({ circle_id: targetCircleId }).eq('id', transferStudent.studentId);
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم نقل الطالب' });
      setTransferStudent(null);
      setTargetCircleId('');
      fetchCircles();
    }
    setLoading(false);
  };

  const openEdit = (circle: Circle) => {
    setForm({ name: circle.name, teacher_name: circle.teacher_name || '', sponsor: circle.sponsor || '' });
    setEditCircle(circle);
  };

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {role === 'admin' && (
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="font-display text-xl font-bold text-primary">
              {role === 'teacher' ? 'بيانات الحلقة' : (activeComplexId && activeComplexName ? `حلقات مجمع ${activeComplexName}` : 'الحلقات الشاملة')}
            </h1>
            {!activeComplexId && role === 'admin' && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">كل المجمعات</span>
            )}
          </div>
        </div>
        {role === 'admin' && (
          <Button size="sm" onClick={() => { setForm({ name: '', teacher_name: '', sponsor: '' }); setFormComplexId(activeComplexId || ''); setShowAdd(true); }}>
            <Plus className="h-4 w-4 ml-1" /> إضافة
          </Button>
        )}
      </div>

      {/* فلتر المجمع في الرؤية الشاملة */}
      {!activeComplexId && role === 'admin' && (
        <div className="flex justify-end">
          <Select value={filterComplex} onValueChange={setFilterComplex}>
            <SelectTrigger className="w-48 text-right"><SelectValue placeholder="تصفية بالمجمع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المجمعات</SelectItem>
              {complexes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <Accordion type="single" collapsible className="space-y-2">
        {filteredCircles.map((circle) => (
          <AccordionItem key={circle.id} value={circle.id} className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3 w-full pl-2">
                <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                  <CircleDot className="h-4 w-4 text-primary" />
                </div>
                <div className="text-right flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{circle.name}</p>
                    {!activeComplexId && role === 'admin' && (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full border border-indigo-100 shrink-0">
                        <Building2 className="w-3 h-3" /> {circle.complex_name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap mt-0.5">
                    <Users className="h-3 w-3" /> {circle.students?.length ?? 0} طالب
                    {circle.teacher_name && <span className="mr-2">• {circle.teacher_name}</span>}
                    {!activeComplexId && role === 'admin' && (
                      <span className="sm:hidden block w-full text-indigo-600 mt-0.5">🏢 {circle.complex_name}</span>
                    )}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 space-y-3">
              {(circle.teacher_name || circle.sponsor) && (
                <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                  {circle.teacher_name && <p><span className="text-muted-foreground">المعلم:</span> {circle.teacher_name}</p>}
                  {circle.sponsor && <p><span className="text-muted-foreground">الكافل:</span> {circle.sponsor}</p>}
                </div>
              )}

              {role === 'admin' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(circle)}>
                    <Pencil className="h-3 w-3 ml-1" /> تعديل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteCircle(circle.id)}>
                    <Trash2 className="h-3 w-3 ml-1" /> حذف
                  </Button>
                </div>
              )}

              {circle.students && circle.students.length > 0 ? (
                <div className="space-y-1">
                  {circle.students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground ml-2">{s.track}</span>
                        
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedStudentInfo({ ...s, circleName: circle.name })}>
                          <Info className="h-4 w-4 text-blue-500" />
                        </Button>

                        {role === 'admin' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setTransferStudent({ studentId: s.id, studentName: s.name, currentCircleId: circle.id })}>
                              <ArrowRightLeft className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveStudent(s.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-2">لا يوجد طلاب في هذه الحلقة</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredCircles.length === 0 && (
        <p className="text-center text-muted-foreground py-8">لا توجد حلقات مرتبطة بهذا النطاق حالياً</p>
      )}

      {/* Add Circle Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-center">إضافة حلقة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3 text-center">
            
            {!activeComplexId && (
              <div>
                <Label className="block mb-1 text-primary font-bold">اختر المجمع أولاً</Label>
                <Select value={formComplexId} onValueChange={setFormComplexId}>
                  <SelectTrigger dir="rtl" className="text-right border-primary"><SelectValue placeholder="المجمع" /></SelectTrigger>
                  <SelectContent>
                    {complexes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div><Label>اسم الحلقة</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>اسم المعلم</Label><Input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} /></div>
            <div><Label>كافل الحلقة</Label><Input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} /></div>
            <Button className="w-full" onClick={handleAdd} disabled={loading || !form.name.trim() || (!activeComplexId && !formComplexId)}>
              {loading ? '...' : 'إضافة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Circle Dialog */}
      <Dialog open={!!editCircle} onOpenChange={() => setEditCircle(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">تعديل الحلقة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم الحلقة</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>اسم المعلم</Label><Input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} /></div>
            <div><Label>كافل الحلقة</Label><Input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} /></div>
            <Button className="w-full" onClick={handleEdit} disabled={loading || !form.name.trim()}>
              {loading ? '...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Student Dialog */}
      <Dialog open={!!transferStudent} onOpenChange={() => setTransferStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">نقل الطالب: {transferStudent?.studentName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الحلقة الجديدة</Label>
              <Select value={targetCircleId} onValueChange={setTargetCircleId}>
                <SelectTrigger dir="rtl" className="text-right"><SelectValue placeholder="اختر حلقة" /></SelectTrigger>
                <SelectContent>
                  {allCircles
                    .filter(c => c.id !== transferStudent?.currentCircleId)
                    // في الرؤية الشاملة: يعرض لك فقط الحلقات اللي في نفس مجمع الحلقة الحالية
                    .filter(c => !activeComplexId ? c.complex_id === allCircles.find(ac => ac.id === transferStudent?.currentCircleId)?.complex_id : true)
                    .map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleTransfer} disabled={loading || !targetCircleId}>
              {loading ? '...' : 'نقل'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة عرض بيانات الطالب */}
      <Dialog open={!!selectedStudentInfo} onOpenChange={() => setSelectedStudentInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center font-bold">معلومات الطالب</DialogTitle>
          </DialogHeader>
          {selectedStudentInfo && (
            <div className="space-y-4 py-2 text-right" dir="rtl">
              <div className="bg-primary/5 p-4 rounded-xl text-center border border-primary/10">
                <p className="font-bold text-lg text-primary">{selectedStudentInfo.name}</p>
                <p className="text-xs text-muted-foreground">{selectedStudentInfo.track}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div className="flex flex-col border-b border-muted pb-1">
                  <span className="text-muted-foreground text-xs mb-1">المرحلة الدراسية:</span>
                  <b className="text-primary">{selectedStudentInfo.study_stage || '-'}</b>
                </div>
                <div className="flex flex-col border-b border-muted pb-1">
                  <span className="text-muted-foreground text-xs mb-1">الجوال:</span>
                  <b className="text-primary" dir="ltr">{selectedStudentInfo.parent_phone || '-'}</b>
                </div>
                <div className="flex flex-col border-b border-muted pb-1">
                  <span className="text-muted-foreground text-xs mb-1">المستوى الحالي:</span>
                  <b className="text-primary">{selectedStudentInfo.level}</b>
                </div>
                <div className="flex flex-col border-b border-muted pb-1">
                  <span className="text-muted-foreground text-xs mb-1">المسار الحالي:</span>
                  <b className="text-primary">{selectedStudentInfo.track}</b>
                </div>
                <div className="flex flex-col border-b border-muted pb-1">
                  <span className="text-muted-foreground text-xs mb-1">الحلقة:</span>
                  <b className="text-primary">{selectedStudentInfo.circleName || '-'}</b>
                </div>
                <div className="flex flex-col border-b border-muted pb-1">
                  <span className="text-muted-foreground text-xs mb-1">العمر:</span>
                  <b className="text-primary">
                    {selectedStudentInfo.birth_date ? calcAge(selectedStudentInfo.birth_date) : (selectedStudentInfo.age || '-')}
                  </b>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
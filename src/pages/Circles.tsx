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
import { Plus, Users, CircleDot, Trash2, Pencil, ArrowRightLeft } from 'lucide-react';

interface Circle {
  id: string;
  name: string;
  teacher_id: string | null;
  teacher_name: string | null;
  sponsor: string | null;
  students?: { id: string; name: string; track: string }[];
}

export default function Circles() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [allCircles, setAllCircles] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editCircle, setEditCircle] = useState<Circle | null>(null);
  const [transferStudent, setTransferStudent] = useState<{ studentId: string; studentName: string; currentCircleId: string } | null>(null);
  const [targetCircleId, setTargetCircleId] = useState('');
  const [form, setForm] = useState({ name: '', teacher_name: '', sponsor: '' });
  const [loading, setLoading] = useState(false);

  const fetchCircles = async () => {
    const { data } = await supabase.from('circles').select('*, students(id, name, track)');
    if (data) {
      setCircles(data as Circle[]);
      setAllCircles(data.map((c: any) => ({ id: c.id, name: c.name })));
    }
  };

  useEffect(() => { fetchCircles(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('circles').insert({
      name: form.name.trim(),
      teacher_name: form.teacher_name.trim() || null,
      sponsor: form.sponsor.trim() || null,
    });
    if (error) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تمت إضافة الحلقة' });
      setShowAdd(false);
      setForm({ name: '', teacher_name: '', sponsor: '' });
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">الحلقات</h1>
        <Button size="sm" onClick={() => { setForm({ name: '', teacher_name: '', sponsor: '' }); setShowAdd(true); }}>
          <Plus className="h-4 w-4 ml-1" /> إضافة
        </Button>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {circles.map((circle) => (
          <AccordionItem key={circle.id} value={circle.id} className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <CircleDot className="h-4 w-4 text-primary" />
                </div>
                <div className="text-right">
                  <p className="font-semibold">{circle.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {circle.students?.length ?? 0} طالب
                    {circle.teacher_name && <span className="mr-2">• {circle.teacher_name}</span>}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 space-y-3">
              {/* Circle Info */}
              {(circle.teacher_name || circle.sponsor) && (
                <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                  {circle.teacher_name && <p><span className="text-muted-foreground">المعلم:</span> {circle.teacher_name}</p>}
                  {circle.sponsor && <p><span className="text-muted-foreground">الكافل:</span> {circle.sponsor}</p>}
                </div>
              )}

              {/* Circle Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(circle)}>
                  <Pencil className="h-3 w-3 ml-1" /> تعديل
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteCircle(circle.id)}>
                  <Trash2 className="h-3 w-3 ml-1" /> حذف
                </Button>
              </div>

              {/* Students */}
              {circle.students && circle.students.length > 0 ? (
                <div className="space-y-1">
                  {circle.students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground ml-2">{s.track}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setTransferStudent({ studentId: s.id, studentName: s.name, currentCircleId: circle.id })}>
                          <ArrowRightLeft className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemoveStudent(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
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

      {circles.length === 0 && (
        <p className="text-center text-muted-foreground py-8">لا توجد حلقات</p>
      )}

      {/* Add Circle Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-center">إضافة حلقة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3 text-center">
            <div><Label>اسم الحلقة</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>اسم المعلم</Label><Input value={form.teacher_name} onChange={(e) => setForm({ ...form, teacher_name: e.target.value })} /></div>
            <div><Label>كافل الحلقة</Label><Input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} /></div>
            <Button className="w-full" onClick={handleAdd} disabled={loading || !form.name.trim()}>
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
                <SelectTrigger><SelectValue placeholder="اختر حلقة" /></SelectTrigger>
                <SelectContent>
                  {allCircles.filter(c => c.id !== transferStudent?.currentCircleId).map(c => (
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
    </div>
  );
}

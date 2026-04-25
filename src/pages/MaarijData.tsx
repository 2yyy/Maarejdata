import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth'; 
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, Trophy, Clock, FileCheck, Info, User, Trash2, Search, Building2, ArrowRight } from 'lucide-react';
import { calcMaarijReward } from '@/lib/calculations';
import { useNavigate } from 'react-router-dom'; 

export default function MaarijData() {
  const { role, activeComplexId } = useAuth(); 
  const { toast } = useToast();
  const navigate = useNavigate(); 
  
  const [records, setRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [complexes, setComplexes] = useState<any[]>([]); 
  const [activeComplexName, setActiveComplexName] = useState(''); 

  const [activeTab, setActiveTab] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterAge, setFilterAge] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterTrack, setFilterTrack] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');

  
  const [formComplexId, setFormComplexId] = useState<string>('');

  const [form, setForm] = useState({
    student_id: '',
    exam_percentage: '',
    level_status: 'منضبط',
    date: new Date().toISOString().split('T')[0],
    duration: '',
    points_earned: '',
    points_total: '',
    is_completion: false,
    raw_score: ''
  });

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

  const fetchData = async () => {
    let studentsQuery = supabase.from('students').select('*');
    let circlesQuery = supabase.from('circles').select('*');
    let complexesQuery = supabase.from('complexes').select('id, name');

    if (activeComplexId) {
      studentsQuery = studentsQuery.eq('complex_id', activeComplexId);
      circlesQuery = circlesQuery.eq('complex_id', activeComplexId);
    }

    const [ { data: stData }, { data: circData }, { data: compData } ] = await Promise.all([
      studentsQuery,
      circlesQuery,
      complexesQuery
    ]);

    if (compData) {
      setComplexes(compData);
      if (activeComplexId) {
        const cName = compData.find(c => c.id === activeComplexId)?.name || '';
        setActiveComplexName(cName);
      }
    }

    let recData: any[] = [];
    if (stData && stData.length > 0) {
      const studentIds = stData.map(s => s.id);
      const { data } = await supabase
        .from('maarij_data')
        .select('*')
        .in('student_id', studentIds) 
        .order('date', { ascending: false });
      recData = data || [];
    }

    if (stData) {
      const enrichedStudents = stData.map(s => ({
        ...s,
        computed_age: s.birth_date ? calcAge(s.birth_date) : s.age, 
        circles: circData?.find(c => c.id === s.circle_id),
        complex_name: compData?.find(c => c.id === s.complex_id)?.name || 'مجمع غير محدد'
      }));
      setStudents(enrichedStudents);

      if (recData) {
        const enrichedRecords = recData.map(r => ({
          ...r,
          students: enrichedStudents.find(s => s.id === r.student_id)
        }));
        setRecords(enrichedRecords);
      }
    }
  };

  useEffect(() => { fetchData(); }, [activeComplexId]);

  const completedRecords = records.filter(r => r.completed);
  const examRecords = records.filter(r => !r.completed);
  const finishersIds = new Set(completedRecords.map(r => r.student_id));
  const activeStudents = students.filter(s => !finishersIds.has(s.id));

  const uniqueAges = Array.from(new Set(students.map(s => String(s.computed_age)).filter(a => a && a !== 'null' && a !== 'undefined'))).sort();
  const uniqueStages = Array.from(new Set(students.map(s => s.study_stage).filter(Boolean)));
  const uniqueTracks = Array.from(new Set(students.map(s => s.track).filter(Boolean)));
  const uniqueLevels = Array.from(new Set(students.map(s => String(s.level)).filter(l => l && l !== 'null' && l !== 'undefined'))).sort((a, b) => Number(a) - Number(b));

  const handleAdd = async () => {
    if (!form.student_id) return;
    setLoading(true);
    
    const student = students.find(s => s.id === form.student_id);

    const payload: any = {
      student_id: form.student_id,
      date: form.date,
      completed: form.is_completion,
      recorded_level: student?.level,
      recorded_track: student?.track
    };

    if (form.is_completion) {
      payload.completed_at = form.date;
      payload.level_status_detail = form.duration;
    } else {
      const examPct = parseFloat(form.exam_percentage) || 0;
      payload.exam_percentage = examPct;
      payload.rewards = student ? calcMaarijReward(student.track, examPct) : 0;
      payload.level_status = form.level_status; 
      payload.points_earned = parseFloat(form.points_earned) || 0;
      payload.points_total = parseFloat(form.points_total) || 0;
    }

    const { error } = await supabase.from('maarij_data').insert(payload);

    if (error) {
      toast({ title: 'خطأ في قاعدة البيانات', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ بنجاح' });
      setShowAdd(false);
      setForm({ student_id: '', exam_percentage: '', level_status: 'منضبط', date: new Date().toISOString().split('T')[0], duration: '', points_earned: '', points_total: '', is_completion: false, raw_score: '' });
      setFormComplexId('');
      fetchData();
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    await supabase.from('maarij_data').delete().eq('id', itemToDelete);
    fetchData();
    setItemToDelete(null);
  };

  const getFilteredData = () => {
    let baseData = [];
    if (activeTab === 'all') baseData = students;
    else if (activeTab === 'tested') baseData = examRecords;
    else if (activeTab === 'completed') baseData = completedRecords;
    else if (activeTab === 'active') baseData = activeStudents;

    return baseData.filter((item: any) => {
      const s = (activeTab === 'all' || activeTab === 'active') ? item : (item.students || {});
      
      const matchName = !searchQuery || (s.name || '').includes(searchQuery);
      const matchAge = filterAge === 'all' || String(s.computed_age) === filterAge;
      const matchStage = filterStage === 'all' || s.study_stage === filterStage;
      const matchTrack = filterTrack === 'all' || s.track === filterTrack;
      const matchLevel = filterLevel === 'all' || String(s.level) === filterLevel;

      return matchName && matchAge && matchStage && matchTrack && matchLevel;
    });
  };

  
  const availableStudentsForAdd = students.filter(s => {
    if (s.status === 'مفصول') return false;
    if (activeComplexId) return true; 
    if (formComplexId) return s.complex_id === formComplexId; 
    return false; 
  });

  return (
    <div className="space-y-4 pb-10" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* */}
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div>
            {/* */}
            <h1 className="font-display text-xl font-bold text-primary">
              {activeComplexId && activeComplexName ? `بيانات مجمع ${activeComplexName}` : 'بيانات المعارج الشاملة'}
            </h1>
            {!activeComplexId && role === 'admin' && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">كل المجمعات</span>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => {
          setForm(f => ({ ...f, is_completion: activeTab === 'completed' }));
          setFormComplexId(activeComplexId || ''); 
          setShowAdd(true);
        }}>
          <Plus className="h-4 w-4 ml-1" />
          {activeTab === 'completed' ? 'إضافة ختمة' : 'إضافة اختبار'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card><CardContent className="p-3 text-center">
          <Users className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{students.length}</p>
          <p className="text-[10px] text-muted-foreground">إجمالي الطلاب</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <FileCheck className="h-4 w-4 mx-auto text-indigo-500 mb-1" />
          <p className="text-lg font-bold">{examRecords.length}</p>
          <p className="text-[10px] text-muted-foreground">الاختبارات</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Trophy className="h-4 w-4 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold">{completedRecords.length}</p>
          <p className="text-[10px] text-muted-foreground">الخاتمين</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="h-4 w-4 mx-auto text-orange-500 mb-1" />
          <p className="text-lg font-bold">{activeStudents.length}</p>
          <p className="text-[10px] text-muted-foreground">قيد التقدم</p>
        </CardContent></Card>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم..." className="pr-10 text-right" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="المرحلة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المراحل</SelectItem>
              {uniqueStages.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={filterAge} onValueChange={setFilterAge}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="العمر" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأعمار</SelectItem>
              {uniqueAges.map(a => <SelectItem key={a} value={a}>{a} سنة</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={filterTrack} onValueChange={setFilterTrack}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="المسار" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المسارات</SelectItem>
              {uniqueTracks.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="المستوى" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المستويات</SelectItem>
              {uniqueLevels.map(l => <SelectItem key={l} value={l}>مستوى {l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="w-full h-auto flex-wrap bg-muted/30">
          <TabsTrigger value="all" className="flex-1 py-2 text-xs">الكل</TabsTrigger>
          <TabsTrigger value="tested" className="flex-1 py-2 text-xs">المختبرين</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 py-2 text-xs">الخاتمين</TabsTrigger>
          <TabsTrigger value="active" className="flex-1 py-2 text-xs">قيد التقدم</TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-2">
          {getFilteredData().map((item: any) => {
            const isStudent = activeTab === 'all' || activeTab === 'active';
            const s = isStudent ? item : item.students;
            const isFinisher = finishersIds.has(s?.id);

            const displayLevel = item.recorded_level || s?.level;
            const displayTrack = item.recorded_track || s?.track;

            return (
              <Card key={item.id} className={s?.status === 'مفصول' ? 'border-red-200 bg-red-50/20' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-right">
                      <div className={`p-2 rounded-full ${s?.status === 'مفصول' ? 'bg-red-100 text-red-600' : isFinisher ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
                        {isFinisher ? <Trophy className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className={`font-bold ${s?.status === 'مفصول' ? 'text-red-700' : ''}`}>
                          {s?.name} {s?.status === 'مفصول' && <span className="text-xs text-red-600 font-normal mr-1">(مفصول)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isFinisher ? <span className="text-green-600 font-bold">خاتم</span> : `مستوى ${displayLevel}`} | {displayTrack}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {/* */}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedStudentInfo(s)}>
                        <Info className="h-4 w-4 text-blue-500" />
                      </Button>
                      {!isStudent && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setItemToDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>

                  {activeTab === 'tested' && (
                    <div className="mt-3 bg-muted/50 p-3 rounded-lg relative">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px] text-center mb-6">
                        <div><p className="text-muted-foreground">النسبة</p><b className="text-primary">{item.exam_percentage}%</b></div>
                        <div><p className="text-muted-foreground">المكافأة</p><b className="text-primary">{item.rewards}</b></div>
                        <div><p className="text-muted-foreground">النقاط</p><b className="text-primary">{item.points_earned}/{item.points_total}</b></div>
                        <div><p className="text-muted-foreground">الحالة</p><b className="text-primary">{item.level_status}</b></div>
                      </div>

                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-muted-foreground/10">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.date}
                        </div>
                        <div className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {displayTrack} | مستوى {displayLevel}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'completed' && (
                    <div className="flex justify-between text-[10px] mt-2 border-t pt-2">
                      <span>تاريخ الختم: {item.completed_at}</span>
                      <span>المدة: {item.level_status_detail}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Tabs>

      <Dialog open={!!selectedStudentInfo} onOpenChange={() => setSelectedStudentInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center font-bold">معلومات الطالب</DialogTitle>
          </DialogHeader>
          {selectedStudentInfo && (() => {
            const completionData = records.find(r => r.student_id === selectedStudentInfo.id && r.completed);
            const isFinisher = !!completionData;
            
            return (
              <div className="space-y-4 py-2 text-right" dir="rtl">
                <div className={`bg-primary/5 p-4 rounded-xl text-center border ${selectedStudentInfo.status === 'مفصول' ? 'border-red-200 bg-red-50' : 'border-primary/10'}`}>
                  <p className={`font-bold text-lg ${selectedStudentInfo.status === 'مفصول' ? 'text-red-700' : 'text-primary'}`}>
                    {selectedStudentInfo.name}
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">{selectedStudentInfo.track}</p>
                  
                  {/* */}
                  {!activeComplexId && role === 'admin' && (
                    <div className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-200 shadow-sm">
                      <Building2 className="h-3.5 w-3.5" /> 
                      {selectedStudentInfo.complex_name}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  {selectedStudentInfo.status === 'مفصول' && (
                    <div className="col-span-2 flex flex-col border border-red-200 pb-2 bg-red-50 p-3 rounded">
                      <span className="text-red-700 text-sm font-bold mb-1">حالة الطالب: مفصول</span>
                      <span className="text-red-600 text-xs font-semibold">السبب: {selectedStudentInfo.dismissal_reason || 'غير محدد'}</span>
                    </div>
                  )}
                
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">المرحلة الدراسية:</span>
                    <b className="text-primary">{selectedStudentInfo.study_stage || '-'}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">الجوال:</span>
                    <b className="text-primary" dir="ltr">{selectedStudentInfo.parent_phone || '-'}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">عدد الاختبارات:</span>
                    <b className="text-primary">{examRecords.filter(r => r.student_id === selectedStudentInfo.id).length}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">المستوى الحالي:</span>
                    <b className={isFinisher ? "text-green-600 font-bold" : "text-primary"}>
                      {isFinisher ? "خاتم" : selectedStudentInfo.level}
                    </b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">المسار الحالي:</span>
                    <b className="text-primary">{selectedStudentInfo.track}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">الحلقة:</span>
                    <b className="text-primary">{selectedStudentInfo.circles?.name || '-'}</b>
                  </div>
                  <div className="flex flex-col border-b border-muted pb-1">
                    <span className="text-muted-foreground text-xs mb-1">العمر:</span>
                    <b className="text-primary">{selectedStudentInfo.computed_age || '-'}</b>
                  </div>
                  
                  {isFinisher && (
                    <>
                      <div className="flex flex-col border-b border-green-100 pb-1 bg-green-50/50 p-1 rounded">
                        <span className="text-green-700 text-xs mb-1 font-semibold">تاريخ الختم:</span>
                        <b className="text-green-600">{completionData.completed_at || completionData.date}</b>
                      </div>
                      <div className="flex flex-col border-b border-green-100 pb-1 bg-green-50/50 p-1 rounded">
                        <span className="text-green-700 text-xs mb-1 font-semibold">مدة الختمة:</span>
                        <b className="text-green-600">{completionData.level_status_detail || 'غير محددة'}</b>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-right">{form.is_completion ? 'إضافة ختمة' : 'إضافة اختبار'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            
            {/* */}
            {!activeComplexId && (
              <div className="text-center">
                <Label className="block mb-1">اختر المجمع أولاً</Label>
                <Select value={formComplexId} onValueChange={(v) => {
                  setFormComplexId(v);
                  setForm({...form, student_id: ''}); 
                }}>
                  <SelectTrigger className="text-right"><SelectValue placeholder="اختر المجمع..." /></SelectTrigger>
                  <SelectContent>
                    {complexes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="text-center"><Label className="block mb-1">اسم الطالب</Label>
              <Select 
                value={form.student_id} 
                onValueChange={(v) => setForm({...form, student_id: v})}
                disabled={!activeComplexId && !formComplexId} 
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder={(!activeComplexId && !formComplexId) ? 'الرجاء اختيار المجمع' : 'اختر طالب...'} />
                </SelectTrigger>
                <SelectContent>
                  {availableStudentsForAdd.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.is_completion ? (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div><Label className="block mb-1">تاريخ الختم</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div><Label className="block mb-1">المدة</Label><Input placeholder="مثال: 5 أشهر" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} /></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div>
                    <Label className="block mb-1 font-bold">الدرجة من 95</Label>
                    <Input 
                      type="number" 
                      value={form.raw_score} 
                      onChange={e => {
                        const score = e.target.value;
                        const percentage = score ? ((parseFloat(score) / 95) * 100).toFixed(2) : '';
                        setForm({...form, raw_score: score, exam_percentage: percentage});
                      }} 
                    />
                  </div>
                  <div><Label className="block mb-1">النسبة %</Label><Input type="number" value={form.exam_percentage} readOnly className="bg-muted" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div><Label className="block mb-1">الحالة</Label>
                    <Select value={form.level_status} onValueChange={v => setForm({...form, level_status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      {/* */}
                      <SelectContent>
                        <SelectItem value="منضبط">منضبط</SelectItem>
                        <SelectItem value="متقدم">متقدم</SelectItem>
                        <SelectItem value="متأخر">متأخر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="block mb-1">تاريخ الرصد</Label><Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t pt-2 text-center">
                  <div><Label className="block mb-1 text-xs font-bold">النقاط المحققة</Label><Input type="number" value={form.points_earned} onChange={e => setForm({...form, points_earned: e.target.value})} /></div>
                  <div><Label className="block mb-1 text-xs font-bold">النقاط الكاملة</Label><Input type="number" value={form.points_total} onChange={e => setForm({...form, points_total: e.target.value})} /></div>
                </div>
              </>
            )}
            <Button className="w-full" onClick={handleAdd} disabled={loading}>{loading ? 'جاري الحفظ...' : 'حفظ البيانات'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-right">تأكيد الحذف</DialogTitle></DialogHeader>
          <div className="text-right text-sm py-4">هل أنت متأكد من حذف هذا السجل؟</div>
          <DialogFooter className="flex gap-2"><Button variant="ghost" onClick={() => setItemToDelete(null)}>إلغاء</Button><Button variant="destructive" onClick={confirmDelete}>حذف</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
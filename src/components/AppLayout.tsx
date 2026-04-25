import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Users, LayoutDashboard, LogOut, CircleDot, ClipboardCheck, Activity, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const adminNavItems = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/students', label: 'الطلاب', icon: Users },
  { path: '/circles', label: 'الحلقات', icon: CircleDot },
  { path: '/summary', label: 'الملخص', icon: BarChart3 }, 
];

const teacherNavItems = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { path: '/daily-evaluation', label: 'التقييم اليومي', icon: ClipboardCheck },
  { path: '/monitoring', label: 'الإحصائيات', icon: Activity },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { role, signOut, setActiveComplexId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = role === 'admin' ? adminNavItems : teacherNavItems;

  const handleNavigation = (path: string) => {
   
    
    if (role === 'admin' && path !== '/summary') {
      setActiveComplexId(null);
    }
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* الشريط العلوي */}
      <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <h1 className="font-display text-lg font-bold">منصة معارج</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="text-primary-foreground hover:bg-primary/80"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="flex-1 p-4 pb-20 max-w-4xl mx-auto w-full">
        {children}
      </main>

      {/* الشريط السفلي */}
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center py-2 px-3 min-w-0 flex-1 transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] mt-1 truncate font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
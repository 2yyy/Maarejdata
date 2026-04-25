import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'teacher';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  circleId: string | null; 
  userComplexId: string | null; 
  activeComplexId: string | null; 
  setActiveComplexId: (id: string | null) => void; 
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [circleId, setCircleId] = useState<string | null>(null);
  const [userComplexId, setUserComplexId] = useState<string | null>(null);
  
  
  const [activeComplexId, setInternalActiveComplexId] = useState<string | null>(() => {
    return localStorage.getItem('activeComplexId');
  });

  
  const setActiveComplexId = (id: string | null) => {
    setInternalActiveComplexId(id);
    if (id) {
      localStorage.setItem('activeComplexId', id);
    } else {
      localStorage.removeItem('activeComplexId');
    }
  };

  const [loading, setLoading] = useState(true);

  const fetchUserContext = async (userId: string) => {
    
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, complex_id')
      .eq('user_id', userId)
      .maybeSingle();
      
    const fetchedRole = (roleData?.role as AppRole) ?? null;
    const fetchedComplexId = roleData?.complex_id ?? null;

    setRole(fetchedRole);
    setUserComplexId(fetchedComplexId);
    
    
    if (fetchedComplexId) {
      setActiveComplexId(fetchedComplexId);
    } else {
      const savedComplex = localStorage.getItem('activeComplexId');
      setActiveComplexId(savedComplex);
    }

    
    if (fetchedRole === 'teacher') {
      const { data: circleData } = await supabase
        .from('circles')
        .select('id')
        .eq('teacher_id', userId)
        .maybeSingle();
      setCircleId(circleData?.id ?? null);
    } else {
      setCircleId(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUserContext(session.user.id), 0);
        } else {
          setRole(null);
          setCircleId(null);
          setUserComplexId(null);
          setActiveComplexId(null); 
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserContext(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setCircleId(null);
    setUserComplexId(null);
    setActiveComplexId(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, session, role, circleId, 
      userComplexId, activeComplexId, setActiveComplexId, 
      loading, signIn, signUp, signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
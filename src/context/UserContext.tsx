import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '');
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email || '');
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, we might want to create a default one or handle it
      }

      if (data) {
        setUser({
          id: userId,
          email: email,
          role: data.role || 'staff',
          name: data.name || 'Unknown',
          avatar: data.avatar || 'https://picsum.photos/seed/user/100/100',
          department: data.department || '',
          manager_id: data.manager_id,
          employeeId: data.employee_id,
          dob: data.dob,
          gender: data.gender,
          position: data.position,
          joiningDate: data.joining_date,
          contractType: data.contract_type,
          lineManager: data.line_manager,
          companyEmail: data.company_email,
          personalEmail: data.personal_email,
          phone: data.phone,
          permanentAddress: data.permanent_address,
          temporaryAddress: data.temporary_address,
          idCardNumber: data.id_card_number,
          idCardDate: data.id_card_date,
          idCardPlace: data.id_card_place,
          bankAccountNumber: data.bank_account_number,
          bankName: data.bank_name,
          bankBranch: data.bank_branch,
        });
      } else {
        // Fallback if no profile found but user is authenticated
        setUser({
          id: userId,
          email: email,
          role: 'staff',
          name: email.split('@')[0],
          avatar: 'https://picsum.photos/seed/user/100/100',
          department: '',
        });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <UserContext.Provider value={{ user, setUser, isAuthenticated: !!user, isLoading, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

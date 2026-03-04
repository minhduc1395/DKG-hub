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
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session check error:", error);
        // If session is invalid (e.g. invalid refresh token), ensure we are logged out
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        fetchProfile(session.user.id, session.user.email || '');
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          // Only fetch profile if we don't have it or if the user changed
          // This prevents unnecessary fetches on token refresh
          setUser(prev => {
            if (prev?.id === session.user.id) return prev;
            fetchProfile(session.user.id, session.user.email || '');
            return prev;
          });
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
      // Fetch profile with nested relations
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          job_positions (
            title,
            roles (
              role_name,
              role_permissions (
                features (
                  feature_key
                )
              )
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, we might want to create a default one or handle it
      }

      if (data) {
        // Log raw data for debugging
        console.log('Raw Profile Data:', data);
        console.log('Job Positions Raw:', data.job_positions);

        // Handle potential array or object response from Supabase relations
        const jobPosition = Array.isArray(data.job_positions) ? data.job_positions[0] : data.job_positions;
        console.log('Processed Job Position:', jobPosition);

        const roleData = jobPosition ? (Array.isArray(jobPosition.roles) ? jobPosition.roles[0] : jobPosition.roles) : null;
        console.log('Processed Role Data:', roleData);
        
        const rawRoleName = roleData?.role_name;
        // Normalize role to lowercase and default to 'staff'
        const roleName = rawRoleName ? rawRoleName.toLowerCase() : 'staff';
        
        console.log('Final Role Name:', roleName);

        // Extract permissions
        const permissionsList = roleData?.role_permissions || [];
        const permissions = Array.isArray(permissionsList) 
          ? permissionsList.map((rp: any) => rp.features?.feature_key).filter(Boolean)
          : [];

        setUser({
          id: userId,
          email: email,
          role: roleName as 'staff' | 'manager',
          permissions: permissions,
          name: data.full_name || 'Unknown',
          avatar: data.avatar_url || 'https://picsum.photos/seed/user/100/100',
          department: data.department || '',
          manager_id: data.manager_id,
          employeeId: data.employee_id,
          dob: data.dob,
          gender: data.gender,
          position: jobPosition?.title,
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
          permissions: [],
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

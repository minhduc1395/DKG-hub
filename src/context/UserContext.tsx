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
  const fetchingProfileRef = React.useRef(false);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session check error:", error);
        // If the refresh token is invalid, clear the session to prevent loops
        if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid_refresh_token')) {
          console.warn("Invalid session detected, signing out...");
          supabase.auth.signOut();
        }
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
          fetchingProfileRef.current = false;
          // Clear any cached data
          localStorage.removeItem('supabase.auth.token');
          return;
        }

        if (session?.user) {
          fetchProfile(session.user.id, session.user.email || '');
        } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          // If we get a token refresh event but no user, it might be an error state
          if (!session) {
            setUser(null);
            setIsLoading(false);
          }
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // Run only once on mount

  const fetchProfile = async (userId: string, email: string) => {
    if (fetchingProfileRef.current) return;
    fetchingProfileRef.current = true;

    try {
      // Fetch profile with specific fields
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, avatar_url, department, manager_id, employee_id, dob, gender, joining_date, contract_type, line_manager, company_email, personal_email, phone, permanent_address, temporary_address, id_card_number, id_card_date, id_card_place, bank_account_number, bank_name, bank_branch,
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
      }

      if (data) {
        // Handle potential array or object response from Supabase relations
        const jobPosition = Array.isArray(data.job_positions) ? data.job_positions[0] : data.job_positions;
        const roleData = jobPosition ? (Array.isArray(jobPosition.roles) ? jobPosition.roles[0] : jobPosition.roles) : null;
        
        const rawRoleName = roleData?.role_name;
        // Normalize role to lowercase and default to 'staff'
        const roleName = rawRoleName ? rawRoleName.toLowerCase() : 'staff';

        // Extract permissions
        const permissionsList = roleData?.role_permissions || [];
        const permissions = Array.isArray(permissionsList) 
          ? permissionsList.map((rp: any) => rp.features?.feature_key).filter(Boolean)
          : [];

        // Prioritize database value as source of truth
        const avatarUrl = data.avatar_url || 'https://picsum.photos/seed/user/100/100';
        
        // Update cache with fresh database value to ensure consistency
        try {
          localStorage.setItem(`avatar_${userId}`, avatarUrl);
        } catch (e) {
          console.warn('Failed to update avatar cache in localStorage:', e);
        }

        setUser({
          id: userId,
          email: email,
          role: roleName as any, // Use any or Role to avoid TS errors if Role is not fully synced
          permissions: permissions,
          name: data.full_name || 'Unknown',
          avatar: avatarUrl,
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
      fetchingProfileRef.current = false;
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

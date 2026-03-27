import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';

export type SimulatedRole = 'staff' | 'accountant' | 'bod' | 'manager' | null;

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  simulatedRole: SimulatedRole;
  setSimulatedRole: React.Dispatch<React.SetStateAction<SimulatedRole>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [actualUser, setActualUser] = useState<User | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<SimulatedRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingProfileRef = React.useRef(false);

  const user = React.useMemo(() => {
    if (!actualUser) return null;
    if (actualUser.email === 'admin@gmail.com' && simulatedRole) {
      return {
        ...actualUser,
        role: simulatedRole as any,
        department: simulatedRole === 'bod' ? 'BOD' : (simulatedRole === 'accountant' ? 'Finance' : actualUser.department),
        position: simulatedRole === 'bod' ? 'CEO' : (simulatedRole === 'accountant' ? 'Accountant' : (simulatedRole === 'manager' ? 'Manager' : 'Staff')),
      };
    }
    return actualUser;
  }, [actualUser, simulatedRole]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Session check error:", error);
        // If the refresh token is invalid, clear the session to prevent loops
        if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid_refresh_token')) {
          console.warn("Invalid session detected, clearing local storage...");
          
          // Thoroughly clear all supabase auth related keys from localStorage
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase.auth.token') || key.startsWith('sb-'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          
          // Also try to sign out to clear internal SDK state
          supabase.auth.signOut().catch(() => {});
        }
        setIsLoading(false);
        setActualUser(null);
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
          setActualUser(null);
          setIsLoading(false);
          fetchingProfileRef.current = false;
          // Thoroughly clear any cached data
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase.auth.token') || key.startsWith('sb-'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          return;
        }

        if (session?.user) {
          fetchProfile(session.user.id, session.user.email || '');
        } else if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          // If we get a token refresh event but no user, it might be an error state
          if (!session) {
            setActualUser(null);
            setIsLoading(false);
          }
        } else {
          setActualUser(null);
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
        // If the profile fetch fails with an authentication error, sign out to clear state
        if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('invalid_token')) {
          console.warn("Authentication error detected in profile fetch, signing out...");
          supabase.auth.signOut().catch(() => {});
          setActualUser(null);
          setIsLoading(false);
          fetchingProfileRef.current = false;
          return;
        }
      }

      if (data) {
        // Handle potential array or object response from Supabase relations
        const jobPosition = Array.isArray(data.job_positions) ? data.job_positions[0] : data.job_positions;
        const roleData = jobPosition ? (Array.isArray(jobPosition.roles) ? jobPosition.roles[0] : jobPosition.roles) : null;
        
        const rawRoleName = roleData?.role_name;
        const positionTitle = jobPosition?.title;

        // Normalize role to lowercase and default to 'staff'
        // Priority: role_name from roles table > position title > 'staff'
        let roleName = 'staff';
        if (rawRoleName) {
          roleName = rawRoleName.toLowerCase();
        } else if (positionTitle && (
          positionTitle.toLowerCase() === 'ceo' || 
          positionTitle.toLowerCase() === 'chairman' ||
          positionTitle.toLowerCase() === 'bod'
        )) {
          roleName = positionTitle.toLowerCase();
        }

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

        setActualUser({
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
        setActualUser({
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

  const handleSetUser = React.useCallback((newUserOrUpdater: React.SetStateAction<User | null>) => {
    setActualUser((prev) => {
      const nextUser = typeof newUserOrUpdater === 'function' ? newUserOrUpdater(prev) : newUserOrUpdater;
      if (!prev || !nextUser) return nextUser;
      
      if (prev.email === 'admin@gmail.com' && simulatedRole) {
        return {
          ...nextUser,
          role: prev.role,
          department: prev.department,
          position: prev.position,
        };
      }
      return nextUser;
    });
  }, [simulatedRole]);

  return (
    <UserContext.Provider value={{ user, setUser: handleSetUser, isAuthenticated: !!user, isLoading, logout, simulatedRole, setSimulatedRole }}>
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

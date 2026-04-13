import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session and listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch expanded user profile data from the profiles table
  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      data.bloodGroup = data.blood_group;
      data.consultationFee = data.consultation_fee;
      data.chronicConditions = data.chronic_conditions;
      data.city = data.city || '';
      data.state = data.state || '';
      setUser(data);
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw { error: authError.message };
    
    if (authData?.user) {
      // Fetch profile inline so we can return it immediately for the router
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (profileError) throw { error: profileError.message };
      
      profileData.bloodGroup = profileData.blood_group;
      profileData.consultationFee = profileData.consultation_fee;
      profileData.chronicConditions = profileData.chronic_conditions;
      profileData.city = profileData.city || '';
      profileData.state = profileData.state || '';
      
      setUser(profileData);
      return profileData;
    }
  };

  const register = async (formData) => {
    const { email, password, name, role, ...rest } = formData;
    
    // 1. Create Supabase Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) throw { error: authError.message };

    // 2. If Auth succeeds, create their profile record using the returned UID
    if (authData?.user) {
      const dbProfileData = {
        id: authData.user.id,
        role,
        name,
        email,
        phone: rest.phone,
        gender: rest.gender,
        blood_group: rest.bloodGroup,
        specialization: rest.specialization,
        qualification: rest.qualification,
        hospital: rest.hospital,
        city: rest.city || null,
        state: rest.state || null
      };

      const { error: profileError } = await supabase.from('profiles').insert([dbProfileData]);
      if (profileError) throw { error: profileError.message };
      
      const userState = { ...dbProfileData, bloodGroup: rest.bloodGroup };
      setUser(userState);
      return userState;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateUser = async (updatedData) => {
    const { error } = await supabase
      .from('profiles')
      .update(updatedData)
      .eq('id', user.id);
      
    if (error) throw { error: error.message };
    
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;

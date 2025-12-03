import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import { Household, HouseholdMember, Pet } from './types';

interface HouseholdContextType {
  household: Household | null;
  membership: HouseholdMember | null;
  pets: Pet[];
  isLoading: boolean;
  refreshHousehold: () => Promise<void>;
  setHousehold: (household: Household | null) => void;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [membership, setMembership] = useState<HouseholdMember | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshHousehold = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHousehold(null);
        setMembership(null);
        setPets([]);
        setIsLoading(false);
        return;
      }

      // Get user's household membership (use first one if multiple exist)
      const { data: memberData, error: memberError } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1);

      console.log('Member data:', memberData, 'Error:', memberError);

      if (memberError || !memberData || memberData.length === 0) {
        setHousehold(null);
        setMembership(null);
        setPets([]);
        setIsLoading(false);
        return;
      }

      const membership = memberData[0];

      // Fetch household separately
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', membership.household_id)
        .single();

      console.log('Household data:', householdData, 'Error:', householdError);

      if (householdError || !householdData) {
        setHousehold(null);
        setMembership(null);
        setPets([]);
        setIsLoading(false);
        return;
      }

      setMembership(membership);
      setHousehold(householdData);

      // Get pets for this household
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .eq('household_id', membership.household_id)
        .order('created_at', { ascending: true });

      setPets(petsData || []);
    } catch (error) {
      console.error('Error fetching household:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshHousehold();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshHousehold();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <HouseholdContext.Provider
      value={{
        household,
        membership,
        pets,
        isLoading,
        refreshHousehold,
        setHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}

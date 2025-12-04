import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Streak } from '../types';

export function useStreaks(householdId: string | undefined, petId?: string) {
  return useQuery({
    queryKey: ['streaks', householdId, petId],
    queryFn: async () => {
      if (!householdId) return [];

      let query = supabase
        .from('streaks')
        .select('*')
        .eq('household_id', householdId);

      if (petId) {
        query = query.eq('pet_id', petId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      
      return data as Streak[];
    },
    enabled: !!householdId,
  });
}

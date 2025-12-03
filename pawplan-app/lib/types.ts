// Database Types for PawPlan

export type HouseholdRole = 'owner' | 'member' | 'guest';
export type TaskFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type TaskStatus = 'completed' | 'skipped' | 'missed';
export type PlatformType = 'ios' | 'android' | 'web';
export type TaskType = 'food' | 'meds' | 'walk' | 'grooming' | 'other';
export type PetSex = 'male' | 'female' | 'unknown';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  timezone: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  joined_at: string;
}

export interface Pet {
  id: string;
  household_id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: PetSex | null;
  weight_kg: number | null;
  color_code: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  household_id: string;
  title: string;
  task_type: TaskType | null;
  pet_ids: string[];
  frequency: TaskFrequency;
  recurrence_rule: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  household_id: string;
  task_id: string | null;
  pet_id: string;
  completed_by: string | null;
  status: TaskStatus;
  completed_at: string;
  scheduled_for: string | null;
  note: string | null;
}

export interface Streak {
  id: string;
  household_id: string;
  pet_id: string;
  task_id: string | null;
  current_streak: number;
  longest_streak: number;
  last_completed_at: string | null;
}

export interface UserDevice {
  id: string;
  user_id: string;
  platform: PlatformType;
  push_token: string;
  last_seen_at: string;
}

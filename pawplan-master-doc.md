# 📘 PawPlan: Project Master Documentation

## 1. Product Requirements Document (PRD)

**Product:** PawPlan – Multi-Pet Household Scheduler  
**Version:** 1.0 (MVP)  
**Goal:** Eliminate household friction over pet care tasks (feeding, walking, meds) through a shared, real-time schedule.

### 1.1 Core Problem
Households with multiple people and pets struggle with:
- **Uncertainty:** "Did you feed the dog?"
- **Missed Tasks:** Medications or preventatives forgotten.
- **Mental Load:** One person usually carries the entire burden.

### 1.2 MVP Features
1. **Household Shared Calendar** – Unified view of all pet-care tasks.
2. **Smart Reminders** – Push notifications per user.
3. **Who Did What Log** – Real-time completion history.
4. **Streaks & Gamification** – Encourages consistency.
5. **Multi-Pet Profiles** – Per-pet task filtering.

---

## 2. Technical Architecture

### 2.1 Tech Stack
- **Frontend:** React Native (Expo SDK 50+)
- **Router:** Expo Router (File-based routing)
- **Styling:** NativeWind (Tailwind CSS)
- **Backend:** Supabase (Postgres, Auth, Realtime)
- **State:** TanStack Query + React Context

---

## 2.2 Database Schema (Supabase SQL)

*Run this in the Supabase SQL Editor to initialize the database.*

```sql
-- 0. EXTENSIONS & ENUMS
create extension if not exists "uuid-ossp";

create type household_role as enum ('owner', 'member', 'guest');
create type task_freq as enum ('once', 'daily', 'weekly', 'monthly', 'custom');
create type task_status as enum ('completed', 'skipped', 'missed');
create type platform_type as enum ('ios', 'android', 'web');

-- 1. PROFILES
create table profiles (
  id uuid references auth.users not null primary key,
  email text unique not null,
  full_name text check (char_length(full_name) >= 2),
  avatar_url text,
  updated_at timestamp with time zone default now()
);

-- 2. HOUSEHOLDS
create table households (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  invite_code text unique not null,
  timezone text default 'Australia/Melbourne',
  created_by uuid references profiles(id),
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 3. MEMBERS (Junction)
create table household_members (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references households(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role household_role default 'member',
  joined_at timestamp with time zone default now(),
  unique (household_id, user_id)
);
create index idx_members_household on household_members(household_id);
create index idx_members_user on household_members(user_id);

-- 4. PETS
create table pets (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references households(id) on delete cascade not null,
  name text not null,
  species text not null,
  breed text,
  birth_date date,
  sex text check (sex in ('male','female','unknown')),
  weight_kg numeric,
  color_code text,
  avatar_url text,
  created_at timestamp with time zone default now()
);
create index idx_pets_household on pets(household_id);

-- 5. TASKS (Routine Definitions)
create table tasks (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references households(id) on delete cascade not null,
  title text not null,
  task_type text check (task_type in ('food','meds','walk','grooming','other')),
  pet_ids uuid[], -- Array of Pet UUIDs
  frequency task_freq default 'daily',
  recurrence_rule jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);
create index idx_tasks_household on tasks(household_id);
create index idx_tasks_pet_ids on tasks using gin (pet_ids);

-- 6. ACTIVITY LOGS (History)
create table activity_logs (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references households(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete set null,
  pet_id uuid references pets(id) not null,
  completed_by uuid references profiles(id),
  status task_status default 'completed',
  completed_at timestamp with time zone default now(),
  scheduled_for timestamp with time zone,
  note text
);
create index idx_logs_feed on activity_logs (household_id, pet_id, completed_at);

-- 7. STREAKS (Gamification)
create table streaks (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references households(id) on delete cascade,
  pet_id uuid references pets(id) on delete cascade,
  task_id uuid references tasks(id),
  current_streak int default 0,
  longest_streak int default 0,
  last_completed_at timestamp with time zone,
  unique(pet_id, task_id)
);

-- 8. USER DEVICES (Notifications)
create table user_devices (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  platform platform_type not null,
  push_token text not null,
  last_seen_at timestamp with time zone default now(),
  unique(user_id, push_token)
);

-- 9. REALTIME ENABLEMENT
alter publication supabase_realtime add table activity_logs;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table streaks;


---

## 2.3 Automation & Triggers

## **Streak Logic Trigger**

Run this in the SQL Editor to enable gamification.

```sql
create or replace function update_streak_on_log()
returns trigger as $$
declare
  existing_streak int;
  last_time timestamp with time zone;
  time_diff interval;
begin
  if NEW.status = 'completed' and NEW.task_id is not null then
    select current_streak, last_completed_at
    into existing_streak, last_time
    from streaks
    where pet_id = NEW.pet_id and task_id = NEW.task_id;

    if not found then
      insert into streaks (household_id, pet_id, task_id, current_streak, longest_streak, last_completed_at)
      values (NEW.household_id, NEW.pet_id, NEW.task_id, 1, 1, NEW.completed_at);
    else
      time_diff := NEW.completed_at - last_time;

      -- Scenario: Same day (<12h) -> Update time only
      if time_diff < interval '12 hours' then
        update streaks
        set last_completed_at = NEW.completed_at
        where pet_id = NEW.pet_id and task_id = NEW.task_id;

      -- Scenario: Next day (12h–36h) -> Increment
      elsif time_diff >= interval '12 hours' and time_diff < interval '36 hours' then
        update streaks
        set current_streak = current_streak + 1,
            longest_streak = greatest(longest_streak, current_streak + 1),
            last_completed_at = NEW.completed_at
        where pet_id = NEW.pet_id and task_id = NEW.task_id;

      -- Scenario: Missed day (>36h) -> Reset
      else
        update streaks
        set current_streak = 1,
            last_completed_at = NEW.completed_at
        where pet_id = NEW.pet_id and task_id = NEW.task_id;
      end if;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger trigger_update_streaks
after insert on activity_logs
for each row
execute function update_streak_on_log();
```

---

# 2.4 Security Policies (RLS)

## **Helper Function**

Checks household membership securely.

```sql
create or replace function is_household_member(_household_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from household_members
    where household_id = _household_id
      and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;
```

## **Example Policy (User Devices)**

```sql
alter table user_devices enable row level security;

create policy "Users manage their own devices"
on public.user_devices
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

---

# 3. Frontend Architecture

## **3.1 Folder Structure (Expo Router)**

```
/
├── app/
│   ├── (auth)/             # Login/Signup group
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/             # Protected App Routes
│   │   ├── _layout.tsx
│   │   ├── index.tsx       # "Today" Dashboard
│   │   ├── calendar.tsx    # Full Schedule
│   │   ├── pets.tsx        # Pet Profiles
│   │   └── settings.tsx    # Household/Profile
│   ├── _layout.tsx         # Root Auth Guard
│   └── +not-found.tsx
├── components/
│   ├── TaskCard.tsx
│   ├── StreakBadge.tsx
├── lib/
│   ├── supabase.ts         # Connection config
│   └── types.ts            # TS Interfaces
```

---

# 3.2 Master Context Prompt (For AI Coding Agents)

## **Project: PawPlan (React Native MVP)**

### **1. Tech Stack**
- React Native (Expo SDK 50+)
- Expo Router
- Supabase (Postgres + Auth)
- NativeWind

### **2. Database Tables**
profiles, households, pets, tasks, activity_logs

### **3. App Scaffold Steps**
1. Create `lib/supabase.ts` with async storage persistence.
2. In `app/_layout.tsx`, check auth state:
   - No session → redirect to `/(auth)/login`
   - Session exists → redirect to `/(tabs)`
3. Build login screen using `supabase.auth.signInWithPassword`.
4. Build tab layout with Today, Calendar, Pets, Settings.

---

# 4. Git Integration (MCP Workflow)

### 4.1 Initialize Repo
```
git init
```

### 4.2 First Commit
“Initial scaffold: Supabase config and Auth layout”

### 4.3 Add Remote
```
git remote add origin git@github.com:sumanxcodes/PawPlan.git
git push -u origin main
```

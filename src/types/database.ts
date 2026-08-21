/**
 * Generated from the real Supabase project (pjbzqmroevruukxqfjet) via
 * `mcp__supabase__generate_typescript_types`. Do not hand-edit the `Database`
 * type below -- regenerate it the same way after any schema migration:
 *
 *   npx supabase gen types typescript --project-id pjbzqmroevruukxqfjet > src/types/database.ts
 *
 * (then re-add the `Profile` convenience alias at the bottom, which is not
 * part of the generated output).
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          code: string
          created_at: string
          details: Json | null
          distance_km: number | null
          duration_minutes: number | null
          id: string
          notes: string | null
          perceived_intensity: number | null
          performed_at: string
          sport_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          details?: Json | null
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          perceived_intensity?: number | null
          performed_at?: string
          sport_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          details?: Json | null
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          perceived_intensity?: number | null
          performed_at?: string
          sport_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          icon: string | null
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          icon?: string | null
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          icon?: string | null
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      exercise_equipment: {
        Row: {
          equipment_slug: string
          exercise_id: string
        }
        Insert: {
          equipment_slug: string
          exercise_id: string
        }
        Update: {
          equipment_slug?: string
          exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_equipment_equipment_slug_fkey"
            columns: ["equipment_slug"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "exercise_equipment_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          code: string
          common_mistakes: string | null
          created_at: string
          description: string | null
          difficulty: string
          easier_variant_id: string | null
          harder_variant_id: string | null
          id: string
          image_url: string | null
          instructions: string
          is_active: boolean
          movement_pattern: string
          name: string
          primary_muscles: string[]
          secondary_muscles: string[]
          slug: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          code?: string
          common_mistakes?: string | null
          created_at?: string
          description?: string | null
          difficulty: string
          easier_variant_id?: string | null
          harder_variant_id?: string | null
          id?: string
          image_url?: string | null
          instructions: string
          is_active?: boolean
          movement_pattern: string
          name: string
          primary_muscles: string[]
          secondary_muscles?: string[]
          slug: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          code?: string
          common_mistakes?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          easier_variant_id?: string | null
          harder_variant_id?: string | null
          id?: string
          image_url?: string | null
          instructions?: string
          is_active?: boolean
          movement_pattern?: string
          name?: string
          primary_muscles?: string[]
          secondary_muscles?: string[]
          slug?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_easier_variant_id_fkey"
            columns: ["easier_variant_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_harder_variant_id_fkey"
            columns: ["harder_variant_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          sport_id: string | null
          status: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          sport_id?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          sport_id?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          id: string
          order: number
          plan_id: string
          routine_id: string
        }
        Insert: {
          id?: string
          order: number
          plan_id: string
          routine_id: string
        }
        Update: {
          id?: string
          order?: number
          plan_id?: string
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          code: string
          created_at: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
          weight_unit: string
        }
        Insert: {
          code?: string
          created_at?: string
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
          weight_unit?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
          weight_unit?: string
        }
        Relationships: []
      }
      routine_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          order: number
          rest_seconds: number | null
          routine_id: string
          target_duration_seconds: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_sets: number
          target_type: string
          target_weight_kg: number | null
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          order: number
          rest_seconds?: number | null
          routine_id: string
          target_duration_seconds?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets: number
          target_type: string
          target_weight_kg?: number | null
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          order?: number
          rest_seconds?: number | null
          routine_id?: string
          target_duration_seconds?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_sets?: number
          target_type?: string
          target_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          primary_sport_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          primary_sport_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          primary_sport_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_primary_sport_id_fkey"
            columns: ["primary_sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "routines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          completed: boolean
          created_at: string
          duration_seconds: number | null
          exercise_id: string
          id: string
          notes: string | null
          order: number
          perceived_effort: number | null
          reps: number | null
          updated_at: string
          weight_kg: number | null
          workout_session_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          notes?: string | null
          order: number
          perceived_effort?: number | null
          reps?: number | null
          updated_at?: string
          weight_kg?: number | null
          workout_session_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          notes?: string | null
          order?: number
          perceived_effort?: number | null
          reps?: number | null
          updated_at?: string
          weight_kg?: number | null
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          default_muscle_groups: string[]
          description: string | null
          icon: string | null
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          default_muscle_groups?: string[]
          description?: string | null
          icon?: string | null
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          default_muscle_groups?: string[]
          description?: string | null
          icon?: string | null
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_sports: {
        Row: {
          created_at: string
          id: string
          level: string | null
          notes: string | null
          sport_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string | null
          notes?: string | null
          sport_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string | null
          notes?: string | null
          sport_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sports_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "user_sports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          code: string
          completed_at: string | null
          completion_type: string | null
          created_at: string
          id: string
          notes: string | null
          overall_rpe: number | null
          plan_item_id: string | null
          routine_id: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string
          completed_at?: string | null
          completion_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          overall_rpe?: number | null
          plan_item_id?: string | null
          routine_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          completed_at?: string | null
          completion_type?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          overall_rpe?: number | null
          plan_item_id?: string | null
          routine_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_code: { Args: { prefix: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

/** Convenience alias -- this phase's code only ever reads/writes `profiles`. */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

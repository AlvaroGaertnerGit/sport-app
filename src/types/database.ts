/**
 * Provisional, hand-written — covers only `profiles`, the one table this
 * phase's code actually queries. Do not extend this file by hand for other
 * tables; regenerate it once a real Supabase project is reachable:
 *
 *   npx supabase gen types typescript --local > src/types/database.ts   (local, needs Docker)
 *   npx supabase gen types typescript --linked > src/types/database.ts (hosted project)
 *
 * Neither was possible during this phase (no Docker, no linked project) —
 * see supabase/README.md and src/lib/README.md for what remains pending.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          code: string;
          display_name: string | null;
          timezone: string;
          weight_unit: "kg" | "lb";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          code?: string;
          display_name?: string | null;
          timezone?: string;
          weight_unit?: "kg" | "lb";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          display_name: string | null;
          timezone: string;
          weight_unit: "kg" | "lb";
        }>;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

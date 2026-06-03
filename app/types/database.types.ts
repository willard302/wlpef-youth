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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      checkin_records: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checkin_method: string | null
          checkin_points_granted_at: string | null
          created_at: string | null
          email: string
          event_id: string | null
          id: string
          registration_id: string | null
          user_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkin_method?: string | null
          checkin_points_granted_at?: string | null
          created_at?: string | null
          email: string
          event_id?: string | null
          id?: string
          registration_id?: string | null
          user_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checkin_method?: string | null
          checkin_points_granted_at?: string | null
          created_at?: string | null
          email?: string
          event_id?: string | null
          id?: string
          registration_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_records_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_records_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string | null
          email: string
          event_id: string | null
          form_submitted_at: string | null
          google_sheet_row_id: string | null
          id: string
          matched_user_id: string | null
          name: string | null
          registration_points_granted_at: string | null
          synced_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          event_id?: string | null
          form_submitted_at?: string | null
          google_sheet_row_id?: string | null
          id?: string
          matched_user_id?: string | null
          name?: string | null
          registration_points_granted_at?: string | null
          synced_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          event_id?: string | null
          form_submitted_at?: string | null
          google_sheet_row_id?: string | null
          id?: string
          matched_user_id?: string | null
          name?: string | null
          registration_points_granted_at?: string | null
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_matched_user_id_fkey"
            columns: ["matched_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          all_day: boolean | null
          checkin_bonus: number | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_at: string
          google_form_url: string | null
          google_sheet_id: string | null
          id: string
          location: string | null
          participants: string[] | null
          raffle_threshold: number | null
          registration_bonus: number | null
          social_leaderboard: boolean | null
          start_at: string
          status: string | null
          subdomain: string | null
          target_id: string | null
          title: string
        }
        Insert: {
          all_day?: boolean | null
          checkin_bonus?: number | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_at: string
          google_form_url?: string | null
          google_sheet_id?: string | null
          id?: string
          location?: string | null
          participants?: string[] | null
          raffle_threshold?: number | null
          registration_bonus?: number | null
          social_leaderboard?: boolean | null
          start_at: string
          status?: string | null
          subdomain?: string | null
          target_id?: string | null
          title: string
        }
        Update: {
          all_day?: boolean | null
          checkin_bonus?: number | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_at?: string
          google_form_url?: string | null
          google_sheet_id?: string | null
          id?: string
          location?: string | null
          participants?: string[] | null
          raffle_threshold?: number | null
          registration_bonus?: number | null
          social_leaderboard?: boolean | null
          start_at?: string
          status?: string | null
          subdomain?: string | null
          target_id?: string | null
          title?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          checkin_id: string | null
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          points: number
          registration_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          checkin_id?: string | null
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          points: number
          registration_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          checkin_id?: string | null
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          points?: number
          registration_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkin_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          department: string | null
          email: string | null
          gender: string | null
          id: string
          name: string
          phone_number: string | null
          points: number | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          gender?: string | null
          id: string
          name: string
          phone_number?: string | null
          points?: number | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          points?: number | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      process_event_registration_points: {
        Args: { reg_id?: string }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: "attendance" | "lateness" | "leave" | "absence"
    }
    CompositeTypes: {
      event_extended: {
        location: string | null
        description: string | null
        is_public: boolean | null
        participants: string[] | null
        metadata:
          | Database["public"]["CompositeTypes"]["event_extended_meta_data"]
          | null
      }
      event_extended_meta_data: {
        created_at: string | null
        created_by: string | null
      }
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
    Enums: {
      attendance_status: ["attendance", "lateness", "leave", "absence"],
    },
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          buffer_minutes: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          decline_reason: string | null
          details: string | null
          duration_minutes: number
          end_at: string | null
          id: string
          idempotency_key: string | null
          job_id: string | null
          occupied_end_at: string | null
          overran_window: boolean
          provider_id: string | null
          provider_name_snapshot: string | null
          scheduled_date: string
          scheduled_time: string
          service: string
          service_address: string
          service_timezone: string | null
          service_zip: string | null
          start_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          decline_reason?: string | null
          details?: string | null
          duration_minutes?: number
          end_at?: string | null
          id?: string
          idempotency_key?: string | null
          job_id?: string | null
          occupied_end_at?: string | null
          overran_window?: boolean
          provider_id?: string | null
          provider_name_snapshot?: string | null
          scheduled_date: string
          scheduled_time: string
          service: string
          service_address: string
          service_timezone?: string | null
          service_zip?: string | null
          start_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          decline_reason?: string | null
          details?: string | null
          duration_minutes?: number
          end_at?: string | null
          id?: string
          idempotency_key?: string | null
          job_id?: string | null
          occupied_end_at?: string | null
          overran_window?: boolean
          provider_id?: string | null
          provider_name_snapshot?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service?: string
          service_address?: string
          service_timezone?: string | null
          service_zip?: string | null
          start_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      early_access: {
        Row: {
          city: string | null
          created_at: string
          email: string
          email_normalized: string
          full_name: string
          id: string
          location: string
          service_interest: string
          service_slug: string | null
          source: string
          state: string | null
          zip: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          email_normalized: string
          full_name: string
          id?: string
          location: string
          service_interest?: string
          service_slug?: string | null
          source?: string
          state?: string | null
          zip?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          email_normalized?: string
          full_name?: string
          id?: string
          location?: string
          service_interest?: string
          service_slug?: string | null
          source?: string
          state?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      job_documents: {
        Row: {
          created_at: string
          customer_id: string
          external_url: string | null
          id: string
          job_id: string
          kind: Database["public"]["Enums"]["job_document_kind"]
          metadata: Json
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          external_url?: string | null
          id?: string
          job_id: string
          kind?: Database["public"]["Enums"]["job_document_kind"]
          metadata?: Json
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          external_url?: string | null
          id?: string
          job_id?: string
          kind?: Database["public"]["Enums"]["job_document_kind"]
          metadata?: Json
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_provider: boolean
          phone: string | null
          phone_e164: string | null
          provider_since: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          is_provider?: boolean
          phone?: string | null
          phone_e164?: string | null
          provider_since?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_provider?: boolean
          phone?: string | null
          phone_e164?: string | null
          provider_since?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string
          end_minute: number
          id: string
          provider_id: string
          start_minute: number
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_minute: number
          id?: string
          provider_id: string
          start_minute: number
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_minute?: number
          id?: string
          provider_id?: string
          start_minute?: number
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      provider_interest: {
        Row: {
          business_name: string | null
          category_label: string
          category_slug: string
          city: string | null
          created_at: string
          email: string
          email_normalized: string | null
          full_name: string
          id: string
          note: string | null
          phone: string | null
          state: string | null
          zip: string
        }
        Insert: {
          business_name?: string | null
          category_label?: string
          category_slug: string
          city?: string | null
          created_at?: string
          email: string
          email_normalized?: string | null
          full_name: string
          id?: string
          note?: string | null
          phone?: string | null
          state?: string | null
          zip: string
        }
        Update: {
          business_name?: string | null
          category_label?: string
          category_slug?: string
          city?: string | null
          created_at?: string
          email?: string
          email_normalized?: string | null
          full_name?: string
          id?: string
          note?: string | null
          phone?: string | null
          state?: string | null
          zip?: string
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          accepting_bookings: boolean
          availability: string | null
          bio: string | null
          business_name: string
          created_at: string
          default_duration_minutes: number
          id: string
          interest_claimed_at: string | null
          phone: string | null
          service_area: string | null
          service_category: string | null
          service_radius_miles: number | null
          service_zip: string | null
          starting_price: number | null
          travel_buffer_minutes: number
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          accepting_bookings?: boolean
          availability?: string | null
          bio?: string | null
          business_name?: string
          created_at?: string
          default_duration_minutes?: number
          id?: string
          interest_claimed_at?: string | null
          phone?: string | null
          service_area?: string | null
          service_category?: string | null
          service_radius_miles?: number | null
          service_zip?: string | null
          starting_price?: number | null
          travel_buffer_minutes?: number
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          accepting_bookings?: boolean
          availability?: string | null
          bio?: string | null
          business_name?: string
          created_at?: string
          default_duration_minutes?: number
          id?: string
          interest_claimed_at?: string | null
          phone?: string | null
          service_area?: string | null
          service_category?: string | null
          service_radius_miles?: number | null
          service_zip?: string | null
          starting_price?: number | null
          travel_buffer_minutes?: number
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      provider_quotes: {
        Row: {
          created_at: string
          currency: string
          earliest_availability: string
          id: string
          included_work: string[]
          is_demo: boolean
          job_id: string
          notes: string | null
          price: number
          provider_id: string | null
          provider_name_snapshot: string
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
          warranty: string
        }
        Insert: {
          created_at?: string
          currency?: string
          earliest_availability?: string
          id?: string
          included_work?: string[]
          is_demo?: boolean
          job_id: string
          notes?: string | null
          price?: number
          provider_id?: string | null
          provider_name_snapshot?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          warranty?: string
        }
        Update: {
          created_at?: string
          currency?: string
          earliest_availability?: string
          id?: string
          included_work?: string[]
          is_demo?: boolean
          job_id?: string
          notes?: string | null
          price?: number
          provider_id?: string | null
          provider_name_snapshot?: string
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
          warranty?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          category_label: string
          category_slug: string
          created_at: string
          id: string
          is_primary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category_label?: string
          category_slug: string
          created_at?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category_label?: string
          category_slug?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_time_off: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          provider_id: string
          reason: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          provider_id: string
          reason?: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          provider_id?: string
          reason?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          accepted_quote_id: string | null
          after_image_path: string | null
          ai_confidence: number | null
          ai_diagnosis: Json | null
          before_image_path: string | null
          category_label: string
          category_slug: string
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          customer_note: string
          estimated_minutes: number
          expected_price_high: number
          expected_price_low: number
          id: string
          preferred_date: string | null
          preferred_time: string | null
          problem_statement: string
          safety_steps: string[]
          scope_of_work: string[]
          service_address: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
          urgency: string
          verification_note: string | null
          verification_status: Database["public"]["Enums"]["verification_result"]
          verified_at: string | null
          warranty_notes: string | null
        }
        Insert: {
          accepted_quote_id?: string | null
          after_image_path?: string | null
          ai_confidence?: number | null
          ai_diagnosis?: Json | null
          before_image_path?: string | null
          category_label?: string
          category_slug?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          customer_note?: string
          estimated_minutes?: number
          expected_price_high?: number
          expected_price_low?: number
          id?: string
          preferred_date?: string | null
          preferred_time?: string | null
          problem_statement?: string
          safety_steps?: string[]
          scope_of_work?: string[]
          service_address?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          urgency?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_result"]
          verified_at?: string | null
          warranty_notes?: string | null
        }
        Update: {
          accepted_quote_id?: string | null
          after_image_path?: string | null
          ai_confidence?: number | null
          ai_diagnosis?: Json | null
          before_image_path?: string | null
          category_label?: string
          category_slug?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          customer_note?: string
          estimated_minutes?: number
          expected_price_high?: number
          expected_price_low?: number
          id?: string
          preferred_date?: string | null
          preferred_time?: string | null
          problem_statement?: string
          safety_steps?: string[]
          scope_of_work?: string[]
          service_address?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
          urgency?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_result"]
          verified_at?: string | null
          warranty_notes?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          consent_at: string
          created_at: string
          email: string
          email_normalized: string
          id: string
          source: string
          status: string
          unsubscribe_token: string
          updated_at: string
        }
        Insert: {
          consent_at?: string
          created_at?: string
          email: string
          email_normalized: string
          id?: string
          source?: string
          status?: string
          unsubscribe_token?: string
          updated_at?: string
        }
        Update: {
          consent_at?: string
          created_at?: string
          email?: string
          email_normalized?: string
          id?: string
          source?: string
          status?: string
          unsubscribe_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      us_zip3_zones: {
        Row: {
          time_zone: string
          zip3: string
        }
        Insert: {
          time_zone: string
          zip3: string
        }
        Update: {
          time_zone?: string
          zip3?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      extract_service_zip: { Args: { _address: string }; Returns: string }
      get_my_provider_profile: {
        Args: never
        Returns: {
          accepting_bookings: boolean
          availability: string | null
          bio: string | null
          business_name: string
          created_at: string
          default_duration_minutes: number
          id: string
          interest_claimed_at: string | null
          phone: string | null
          service_area: string | null
          service_category: string | null
          service_radius_miles: number | null
          service_zip: string | null
          starting_price: number | null
          travel_buffer_minutes: number
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }[]
        SetofOptions: {
          from: "*"
          to: "provider_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      provider_busy_intervals: {
        Args: { _from: string; _provider_id: string; _to: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      replace_provider_availability: {
        Args: { _hours: Json }
        Returns: undefined
      }
      service_zone_for_zip: { Args: { _zip: string }; Returns: string }
    }
    Enums: {
      app_role: "customer" | "provider"
      booking_status:
        | "pending"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      job_document_kind:
        | "before_photo"
        | "after_photo"
        | "receipt"
        | "warranty"
        | "other"
      job_status:
        | "diagnosed"
        | "quotes_requested"
        | "booked"
        | "in_progress"
        | "needs_verification"
        | "completed"
        | "cancelled"
      quote_status: "pending" | "accepted" | "declined" | "withdrawn"
      verification_result:
        | "not_started"
        | "pending"
        | "appears_completed"
        | "needs_manual_review"
        | "unable_to_verify"
      verification_status: "unverified" | "pending" | "verified"
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
    Enums: {
      app_role: ["customer", "provider"],
      booking_status: [
        "pending",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      job_document_kind: [
        "before_photo",
        "after_photo",
        "receipt",
        "warranty",
        "other",
      ],
      job_status: [
        "diagnosed",
        "quotes_requested",
        "booked",
        "in_progress",
        "needs_verification",
        "completed",
        "cancelled",
      ],
      quote_status: ["pending", "accepted", "declined", "withdrawn"],
      verification_result: [
        "not_started",
        "pending",
        "appears_completed",
        "needs_manual_review",
        "unable_to_verify",
      ],
      verification_status: ["unverified", "pending", "verified"],
    },
  },
} as const

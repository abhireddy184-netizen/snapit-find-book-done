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
      bookings: {
        Row: {
          created_at: string
          customer_id: string
          details: string | null
          id: string
          job_id: string | null
          provider_id: string | null
          provider_name_snapshot: string | null
          scheduled_date: string
          scheduled_time: string
          service: string
          service_address: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          details?: string | null
          id?: string
          job_id?: string | null
          provider_id?: string | null
          provider_name_snapshot?: string | null
          scheduled_date: string
          scheduled_time: string
          service: string
          service_address: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          details?: string | null
          id?: string
          job_id?: string | null
          provider_id?: string | null
          provider_name_snapshot?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service?: string
          service_address?: string
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
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
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
          availability: string | null
          bio: string | null
          business_name: string
          created_at: string
          id: string
          service_area: string | null
          service_category: string | null
          service_radius_miles: number | null
          service_zip: string | null
          starting_price: number | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          business_name?: string
          created_at?: string
          id?: string
          service_area?: string | null
          service_category?: string | null
          service_radius_miles?: number | null
          service_zip?: string | null
          starting_price?: number | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          availability?: string | null
          bio?: string | null
          business_name?: string
          created_at?: string
          id?: string
          service_area?: string | null
          service_category?: string | null
          service_radius_miles?: number | null
          service_zip?: string | null
          starting_price?: number | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

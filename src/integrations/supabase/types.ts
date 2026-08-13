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
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      content_prompt_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          note: string | null
          system_prompt: string
          user_prompt_template: string
          version_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          system_prompt: string
          user_prompt_template: string
          version_no: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          system_prompt?: string
          user_prompt_template?: string
          version_no?: number
        }
        Relationships: []
      }
      content_questionnaire_versions: {
        Row: {
          created_at: string
          created_by: string | null
          form_id: string | null
          id: string
          is_active: boolean
          note: string | null
          schema: Json
          version_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          schema: Json
          version_no: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          schema?: Json
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_questionnaire_versions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          schema: Json
          skeleton_body: string | null
          trust_skeleton_body: string | null
          ancillary_skeletons: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          schema?: Json
          skeleton_body?: string | null
          trust_skeleton_body?: string | null
          ancillary_skeletons?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          schema?: Json
          skeleton_body?: string | null
          trust_skeleton_body?: string | null
          ancillary_skeletons?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_skeleton_versions: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          note: string | null
          version_no: number
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          version_no: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          version_no?: number
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string
          id: string
          payload: Json
          sent_at: string | null
          status: string
          template: string
          to_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          template: string
          to_email: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          sent_at?: string | null
          status?: string
          template?: string
          to_email?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          add_ons: Json
          amount_paid: number
          approved_at: string | null
          archived_at: string | null
          created_at: string
          customer_confirmation_sent_at: string | null
          customer_name: string | null
          delivered_at: string | null
          id: string
          partner_email: string | null
          partner_name: string | null
          partner1_submitted_at: string | null
          partner1_token: string
          partner2_submitted_at: string | null
          partner2_token: string
          plan_type: string
          promo_code: string | null
          questionnaire_expires_at: string | null
          questionnaire_form_id: string | null
          review_started_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          submitted_at: string | null
          updated_at: string
          user_email: string
        }
        Insert: {
          add_ons?: Json
          amount_paid?: number
          approved_at?: string | null
          archived_at?: string | null
          created_at?: string
          customer_confirmation_sent_at?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          id?: string
          partner_email?: string | null
          partner_name?: string | null
          partner1_submitted_at?: string | null
          partner1_token?: string
          partner2_submitted_at?: string | null
          partner2_token?: string
          plan_type: string
          promo_code?: string | null
          questionnaire_expires_at?: string | null
          questionnaire_form_id?: string | null
          review_started_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_email: string
        }
        Update: {
          add_ons?: Json
          amount_paid?: number
          approved_at?: string | null
          archived_at?: string | null
          created_at?: string
          customer_confirmation_sent_at?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          id?: string
          partner_email?: string | null
          partner_name?: string | null
          partner1_submitted_at?: string | null
          partner1_token?: string
          partner2_submitted_at?: string | null
          partner2_token?: string
          plan_type?: string
          promo_code?: string | null
          questionnaire_expires_at?: string | null
          questionnaire_form_id?: string | null
          review_started_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_email?: string
        }
        Relationships: []
      }
      questionnaire_answers: {
        Row: {
          answers: Json
          attorney_flags: Json
          created_at: string
          current_section: number
          id: string
          order_id: string
          partner_number: number
          review_status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          attorney_flags?: Json
          created_at?: string
          current_section?: number
          id?: string
          order_id: string
          partner_number: number
          review_status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          attorney_flags?: Json
          created_at?: string
          current_section?: number
          id?: string
          order_id?: string
          partner_number?: number
          review_status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_answers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      will_document_versions: {
        Row: {
          ai_model: string | null
          attorney_notes: string | null
          created_at: string
          document_kind: string
          id: string
          onedrive_web_url: string | null
          order_id: string
          partner_number: number
          pdf_onedrive_web_url: string | null
          pdf_storage_path: string | null
          version: number
          will_content: Json
          will_document_id: string
        }
        Insert: {
          ai_model?: string | null
          attorney_notes?: string | null
          created_at?: string
          document_kind?: string
          id?: string
          onedrive_web_url?: string | null
          order_id: string
          partner_number: number
          pdf_onedrive_web_url?: string | null
          pdf_storage_path?: string | null
          version: number
          will_content: Json
          will_document_id: string
        }
        Update: {
          ai_model?: string | null
          attorney_notes?: string | null
          created_at?: string
          document_kind?: string
          id?: string
          onedrive_web_url?: string | null
          order_id?: string
          partner_number?: number
          pdf_onedrive_web_url?: string | null
          pdf_storage_path?: string | null
          version?: number
          will_content?: Json
          will_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "will_document_versions_will_document_id_fkey"
            columns: ["will_document_id"]
            isOneToOne: false
            referencedRelation: "will_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      will_documents: {
        Row: {
          ai_model: string | null
          ai_prompt_version: string | null
          approved_at: string | null
          approved_by: string | null
          attorney_notes: string | null
          created_at: string
          customer_download_url: string | null
          document_kind: string
          draft_generated_at: string | null
          generation_error: string | null
          google_doc_id: string | null
          google_doc_url: string | null
          id: string
          onedrive_item_id: string | null
          onedrive_path: string | null
          onedrive_web_url: string | null
          order_id: string
          partner_number: number
          pdf_onedrive_item_id: string | null
          pdf_onedrive_web_url: string | null
          pdf_storage_path: string | null
          prompt_version_id: string | null
          questionnaire_version_id: string | null
          revision_count: number
          sent_at: string | null
          skeleton_body: string | null
          skeleton_version_id: string | null
          status: string
          updated_at: string
          version: number
          will_content: Json | null
        }
        Insert: {
          ai_model?: string | null
          ai_prompt_version?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attorney_notes?: string | null
          created_at?: string
          customer_download_url?: string | null
          document_kind?: string
          draft_generated_at?: string | null
          generation_error?: string | null
          google_doc_id?: string | null
          google_doc_url?: string | null
          id?: string
          onedrive_item_id?: string | null
          onedrive_path?: string | null
          onedrive_web_url?: string | null
          order_id: string
          partner_number: number
          pdf_onedrive_item_id?: string | null
          pdf_onedrive_web_url?: string | null
          pdf_storage_path?: string | null
          prompt_version_id?: string | null
          questionnaire_version_id?: string | null
          revision_count?: number
          sent_at?: string | null
          skeleton_body?: string | null
          skeleton_version_id?: string | null
          status?: string
          updated_at?: string
          version?: number
          will_content?: Json | null
        }
        Update: {
          ai_model?: string | null
          ai_prompt_version?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attorney_notes?: string | null
          created_at?: string
          customer_download_url?: string | null
          document_kind?: string
          draft_generated_at?: string | null
          generation_error?: string | null
          google_doc_id?: string | null
          google_doc_url?: string | null
          id?: string
          onedrive_item_id?: string | null
          onedrive_path?: string | null
          onedrive_web_url?: string | null
          order_id?: string
          partner_number?: number
          pdf_onedrive_item_id?: string | null
          pdf_onedrive_web_url?: string | null
          pdf_storage_path?: string | null
          prompt_version_id?: string | null
          questionnaire_version_id?: string | null
          revision_count?: number
          sent_at?: string | null
          skeleton_body?: string | null
          skeleton_version_id?: string | null
          status?: string
          updated_at?: string
          version?: number
          will_content?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "will_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "will_documents_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "content_prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "will_documents_questionnaire_version_id_fkey"
            columns: ["questionnaire_version_id"]
            isOneToOne: false
            referencedRelation: "content_questionnaire_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "will_documents_skeleton_version_id_fkey"
            columns: ["skeleton_version_id"]
            isOneToOne: false
            referencedRelation: "content_skeleton_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      will_status_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          partner_number: number | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          partner_number?: number | null
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          partner_number?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "will_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "attorney" | "staff"
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
      app_role: ["admin", "attorney", "staff"],
    },
  },
} as const

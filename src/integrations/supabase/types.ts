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
      addresses: {
        Row: {
          address_lines: string
          city: string
          created_at: string
          district: string | null
          id: string
          is_active: boolean
          label: string
          latitude: number | null
          longitude: number | null
          organization_id: string
          phone: string
          postal_code: string | null
          recipient_name: string
          service_zone: Database["public"]["Enums"]["service_zone"] | null
          updated_at: string
        }
        Insert: {
          address_lines: string
          city: string
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          label: string
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          phone: string
          postal_code?: string | null
          recipient_name: string
          service_zone?: Database["public"]["Enums"]["service_zone"] | null
          updated_at?: string
        }
        Update: {
          address_lines?: string
          city?: string
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          phone?: string
          postal_code?: string | null
          recipient_name?: string
          service_zone?: Database["public"]["Enums"]["service_zone"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agreements: {
        Row: {
          accepted_at: string
          document_type: string
          document_version: string
          id: string
          ip_address: unknown
          organization_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          document_type: string
          document_version: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          document_type?: string
          document_version?: string
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_role: Database["public"]["Enums"]["app_role"] | null
          actor_user_id: string | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          from_state: Json | null
          id: string
          ip_address: unknown
          organization_id: string | null
          reason: string | null
          to_state: Json | null
        }
        Insert: {
          action: string
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          from_state?: Json | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          reason?: string | null
          to_state?: Json | null
        }
        Update: {
          action?: string
          actor_role?: Database["public"]["Enums"]["app_role"] | null
          actor_user_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          from_state?: Json | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          reason?: string | null
          to_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          code: string
          country_origin: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          country_origin?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          country_origin?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_versions: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          payload: Json
          scope: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          payload: Json
          scope: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          payload?: Json
          scope?: string
          version?: number
        }
        Relationships: []
      }
      cuts: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          species_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          species_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          species_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuts_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rank: number | null
          system: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rank?: number | null
          system?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rank?: number | null
          system?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          key: string
          request_hash: string
          response_json: Json | null
          scope: string
          status_code: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          key: string
          request_hash: string
          response_json?: Json | null
          scope: string
          status_code?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          key?: string
          request_hash?: string
          response_json?: Json | null
          scope?: string
          status_code?: number | null
        }
        Relationships: []
      }
      inventory_snapshots: {
        Row: {
          as_of: string
          available_kg: number
          created_at: string
          created_by: string | null
          id: string
          offer_id: string
          on_hand_kg: number
          pack_count: number | null
          source: string
          version: number
        }
        Insert: {
          as_of?: string
          available_kg: number
          created_at?: string
          created_by?: string | null
          id?: string
          offer_id: string
          on_hand_kg: number
          pack_count?: number | null
          source?: string
          version?: number
        }
        Update: {
          as_of?: string
          available_kg?: number
          created_at?: string
          created_by?: string | null
          id?: string
          offer_id?: string
          on_hand_kg?: number
          pack_count?: number | null
          source?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "vendor_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          correlation_id: string | null
          created_at: string
          id: string
          kind: string
          last_error: string | null
          locked_by: string | null
          locked_until: string | null
          max_attempts: number
          payload: Json
          run_at: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          payload?: Json
          run_at?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          correlation_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          locked_by?: string | null
          locked_until?: string | null
          max_attempts?: number
          payload?: Json
          run_at?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: []
      }
      kyb_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["kyb_doc_type"]
          file_name: string
          id: string
          mime_type: string | null
          organization_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["kyb_doc_status"]
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["kyb_doc_type"]
          file_name: string
          id?: string
          mime_type?: string | null
          organization_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["kyb_doc_status"]
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["kyb_doc_type"]
          file_name?: string
          id?: string
          mime_type?: string | null
          organization_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["kyb_doc_status"]
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyb_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_state_history: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_state: Database["public"]["Enums"]["org_status"] | null
          id: string
          organization_id: string
          reason: string | null
          to_state: Database["public"]["Enums"]["org_status"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_state?: Database["public"]["Enums"]["org_status"] | null
          id?: string
          organization_id: string
          reason?: string | null
          to_state: Database["public"]["Enums"]["org_status"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_state?: Database["public"]["Enums"]["org_status"] | null
          id?: string
          organization_id?: string
          reason?: string | null
          to_state?: Database["public"]["Enums"]["org_status"]
        }
        Relationships: [
          {
            foreignKeyName: "org_state_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["membership_status"]
          user_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          user_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          user_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          legal_name: string
          status: Database["public"]["Enums"]["org_status"]
          suspended_reason: string | null
          tax_profile_json: Json | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          legal_name: string
          status?: Database["public"]["Enums"]["org_status"]
          suspended_reason?: string | null
          tax_profile_json?: Json | null
          type: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          legal_name?: string
          status?: Database["public"]["Enums"]["org_status"]
          suspended_reason?: string | null
          tax_profile_json?: Json | null
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      product_evidence: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          object_key: string | null
          product_id: string
          source_url: string | null
          status: Database["public"]["Enums"]["evidence_status"]
          title: string | null
          type: Database["public"]["Enums"]["evidence_type"]
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          object_key?: string | null
          product_id: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["evidence_status"]
          title?: string | null
          type: Database["public"]["Enums"]["evidence_type"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          object_key?: string | null
          product_id?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["evidence_status"]
          title?: string | null
          type?: Database["public"]["Enums"]["evidence_type"]
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_evidence_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          kind: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          kind?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          kind?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          cut_id: string
          description: string | null
          disclosure_version: string | null
          grade_id: string
          id: string
          name: string
          primary_image_url: string | null
          qc_standard_json: Json | null
          sku: string
          species_id: string
          status: Database["public"]["Enums"]["catalog_status"]
          tier: Database["public"]["Enums"]["product_tier"]
          undervalued_disclosure: string | null
          updated_at: string
          version: number
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          cut_id: string
          description?: string | null
          disclosure_version?: string | null
          grade_id: string
          id?: string
          name: string
          primary_image_url?: string | null
          qc_standard_json?: Json | null
          sku: string
          species_id: string
          status?: Database["public"]["Enums"]["catalog_status"]
          tier: Database["public"]["Enums"]["product_tier"]
          undervalued_disclosure?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          cut_id?: string
          description?: string | null
          disclosure_version?: string | null
          grade_id?: string
          id?: string
          name?: string
          primary_image_url?: string | null
          qc_standard_json?: Json | null
          sku?: string
          species_id?: string
          status?: Database["public"]["Enums"]["catalog_status"]
          tier?: Database["public"]["Enums"]["product_tier"]
          undervalued_disclosure?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_cut_id_fkey"
            columns: ["cut_id"]
            isOneToOne: false
            referencedRelation: "cuts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      species: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_offers: {
        Row: {
          base_price_per_kg: number
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          expected_max_kg: number | null
          expected_min_kg: number | null
          id: string
          min_qty: number
          product_id: string
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          qty_step: number
          service_zones: Database["public"]["Enums"]["service_zone"][]
          status: Database["public"]["Enums"]["catalog_status"]
          updated_at: string
          vendor_id: string
          version: number
        }
        Insert: {
          base_price_per_kg: number
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          expected_max_kg?: number | null
          expected_min_kg?: number | null
          id?: string
          min_qty?: number
          product_id: string
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          qty_step?: number
          service_zones?: Database["public"]["Enums"]["service_zone"][]
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
          vendor_id: string
          version?: number
        }
        Update: {
          base_price_per_kg?: number
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          expected_max_kg?: number | null
          expected_min_kg?: number | null
          id?: string
          min_qty?: number
          product_id?: string
          purchase_type?: Database["public"]["Enums"]["purchase_type"]
          qty_step?: number
          service_zones?: Database["public"]["Enums"]["service_zone"][]
          status?: Database["public"]["Enums"]["catalog_status"]
          updated_at?: string
          vendor_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_offers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: {
          _display_name: string
          _legal_name: string
          _type: Database["public"]["Enums"]["org_type"]
        }
        Returns: string
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_internal: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      review_organization: {
        Args: { _decision: string; _org_id: string; _reason?: string }
        Returns: undefined
      }
      submit_organization: { Args: { _org_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "buyer_owner"
        | "buyer_purchaser"
        | "buyer_finance"
        | "vendor_admin"
        | "vendor_operator"
        | "hub_operator"
        | "courier"
        | "qc_officer"
        | "finance_operator"
        | "support"
        | "platform_admin"
        | "auditor"
      catalog_status: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "ARCHIVED"
      evidence_status: "PENDING" | "APPROVED" | "REJECTED"
      evidence_type: "AWARD" | "ASSOCIATION" | "QC" | "DISCLOSURE"
      job_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "DEAD"
      kyb_doc_status: "PENDING" | "ACCEPTED" | "REJECTED"
      kyb_doc_type:
        | "NPWP"
        | "NIB"
        | "KTP_DIREKTUR"
        | "REKENING_KORAN"
        | "SIUP"
        | "OTHER"
      membership_status: "ACTIVE" | "INVITED" | "SUSPENDED" | "REMOVED"
      org_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "SUSPENDED"
      org_type: "BUYER" | "VENDOR" | "INTERNAL"
      product_tier:
        | "COMMODITY_PREMIUM"
        | "SUPER_PREMIUM"
        | "UNDERVALUED_QC"
        | "SBMEAT_HOUSE"
      purchase_type: "LOAF" | "CARTON" | "RETAIL"
      service_zone: "JKT_INNER" | "JKT_OUTER" | "BODETABEK" | "OUT_OF_ZONE"
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
      app_role: [
        "buyer_owner",
        "buyer_purchaser",
        "buyer_finance",
        "vendor_admin",
        "vendor_operator",
        "hub_operator",
        "courier",
        "qc_officer",
        "finance_operator",
        "support",
        "platform_admin",
        "auditor",
      ],
      catalog_status: ["DRAFT", "REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"],
      evidence_status: ["PENDING", "APPROVED", "REJECTED"],
      evidence_type: ["AWARD", "ASSOCIATION", "QC", "DISCLOSURE"],
      job_status: ["PENDING", "RUNNING", "SUCCEEDED", "FAILED", "DEAD"],
      kyb_doc_status: ["PENDING", "ACCEPTED", "REJECTED"],
      kyb_doc_type: [
        "NPWP",
        "NIB",
        "KTP_DIREKTUR",
        "REKENING_KORAN",
        "SIUP",
        "OTHER",
      ],
      membership_status: ["ACTIVE", "INVITED", "SUSPENDED", "REMOVED"],
      org_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
      ],
      org_type: ["BUYER", "VENDOR", "INTERNAL"],
      product_tier: [
        "COMMODITY_PREMIUM",
        "SUPER_PREMIUM",
        "UNDERVALUED_QC",
        "SBMEAT_HOUSE",
      ],
      purchase_type: ["LOAF", "CARTON", "RETAIL"],
      service_zone: ["JKT_INNER", "JKT_OUTER", "BODETABEK", "OUT_OF_ZONE"],
    },
  },
} as const

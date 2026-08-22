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
          {
            foreignKeyName: "addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      admin_inventory: {
        Row: {
          avg_weight_kg: number | null
          avg_weight_text: string | null
          brand: string
          category: Database["public"]["Enums"]["ml_product_category"]
          condition: string | null
          created_at: string
          description: string | null
          featured_rank: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_published: boolean
          markup_idr: number
          name: string
          notes: string | null
          origin: string
          qty_on_hand_kg: number
          sale_price_idr: number
          slug: string | null
          updated_at: string
        }
        Insert: {
          avg_weight_kg?: number | null
          avg_weight_text?: string | null
          brand?: string
          category?: Database["public"]["Enums"]["ml_product_category"]
          condition?: string | null
          created_at?: string
          description?: string | null
          featured_rank?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_published?: boolean
          markup_idr?: number
          name: string
          notes?: string | null
          origin: string
          qty_on_hand_kg?: number
          sale_price_idr?: number
          slug?: string | null
          updated_at?: string
        }
        Update: {
          avg_weight_kg?: number | null
          avg_weight_text?: string | null
          brand?: string
          category?: Database["public"]["Enums"]["ml_product_category"]
          condition?: string | null
          created_at?: string
          description?: string | null
          featured_rank?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_published?: boolean
          markup_idr?: number
          name?: string
          notes?: string | null
          origin?: string
          qty_on_hand_kg?: number
          sale_price_idr?: number
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
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
          {
            foreignKeyName: "agreements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
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
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
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
      buyer_order_status_history: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["ml_order_status"] | null
          id: string
          order_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["ml_order_status"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ml_order_status"] | null
          id?: string
          order_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["ml_order_status"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["ml_order_status"] | null
          id?: string
          order_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["ml_order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "buyer_order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "buyer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_orders: {
        Row: {
          admin_notes: string | null
          buyer_name: string
          buyer_notes: string | null
          created_at: string
          delivery_location: string | null
          id: string
          needed_by: string | null
          order_no: string
          payment_term: Database["public"]["Enums"]["ml_payment_term"]
          product_text: string
          qty_kg: number
          status: Database["public"]["Enums"]["ml_order_status"]
          top_decision: Database["public"]["Enums"]["ml_top_decision"] | null
          updated_at: string
          user_id: string
          vendor_note: string | null
          vendor_user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          buyer_name: string
          buyer_notes?: string | null
          created_at?: string
          delivery_location?: string | null
          id?: string
          needed_by?: string | null
          order_no?: string
          payment_term: Database["public"]["Enums"]["ml_payment_term"]
          product_text: string
          qty_kg: number
          status?: Database["public"]["Enums"]["ml_order_status"]
          top_decision?: Database["public"]["Enums"]["ml_top_decision"] | null
          updated_at?: string
          user_id: string
          vendor_note?: string | null
          vendor_user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          buyer_name?: string
          buyer_notes?: string | null
          created_at?: string
          delivery_location?: string | null
          id?: string
          needed_by?: string | null
          order_no?: string
          payment_term?: Database["public"]["Enums"]["ml_payment_term"]
          product_text?: string
          qty_kg?: number
          status?: Database["public"]["Enums"]["ml_order_status"]
          top_decision?: Database["public"]["Enums"]["ml_top_decision"] | null
          updated_at?: string
          user_id?: string
          vendor_note?: string | null
          vendor_user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          hold_expires_at: string
          id: string
          offer_id: string
          qty_kg: number
          unit_price_snapshot: number
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          hold_expires_at?: string
          id?: string
          offer_id: string
          qty_kg: number
          unit_price_snapshot: number
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          hold_expires_at?: string
          id?: string
          offer_id?: string
          qty_kg?: number
          unit_price_snapshot?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "vendor_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          address_id: string | null
          buyer_org_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["cart_status"]
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          buyer_org_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["cart_status"]
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          buyer_org_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["cart_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
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
      delivery_jobs: {
        Row: {
          courier_user_id: string | null
          created_at: string
          delivered_at: string | null
          fulfillment_id: string
          id: string
          last_tracking_at: string | null
          notes: string | null
          proof_json: Json | null
          queue_number: string
          scheduled_date: string
          started_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
          vehicle_label: string | null
          version: number
        }
        Insert: {
          courier_user_id?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_id: string
          id?: string
          last_tracking_at?: string | null
          notes?: string | null
          proof_json?: Json | null
          queue_number: string
          scheduled_date: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          vehicle_label?: string | null
          version?: number
        }
        Update: {
          courier_user_id?: string | null
          created_at?: string
          delivered_at?: string | null
          fulfillment_id?: string
          id?: string
          last_tracking_at?: string | null
          notes?: string | null
          proof_json?: Json | null
          queue_number?: string
          scheduled_date?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          vehicle_label?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_jobs_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "fulfillments"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking_points: {
        Row: {
          accuracy_m: number | null
          delivery_job_id: string
          id: number
          latitude: number
          longitude: number
          recorded_at: string
          speed_mps: number | null
        }
        Insert: {
          accuracy_m?: number | null
          delivery_job_id: string
          id?: number
          latitude: number
          longitude: number
          recorded_at?: string
          speed_mps?: number | null
        }
        Update: {
          accuracy_m?: number | null
          delivery_job_id?: string
          id?: number
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed_mps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_points_delivery_job_id_fkey"
            columns: ["delivery_job_id"]
            isOneToOne: false
            referencedRelation: "delivery_jobs"
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
      fulfillments: {
        Row: {
          buyer_org_id: string
          created_at: string
          delivery_address_id: string
          hub_deadline_at: string | null
          id: string
          order_id: string
          status: Database["public"]["Enums"]["fulfillment_status"]
          updated_at: string
          version: number
        }
        Insert: {
          buyer_org_id: string
          created_at?: string
          delivery_address_id: string
          hub_deadline_at?: string | null
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["fulfillment_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          buyer_org_id?: string
          created_at?: string
          delivery_address_id?: string
          hub_deadline_at?: string | null
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["fulfillment_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fulfillments_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillments_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "fulfillments_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      hub_receipts: {
        Row: {
          created_at: string
          evidence_object_keys: Json | null
          fulfillment_id: string
          id: string
          lot_expiry_json: Json | null
          notes: string | null
          packaging_condition: Database["public"]["Enums"]["packaging_condition"]
          received_at: string
          received_by: string
          received_weight_kg: number
          temperature_c: number | null
        }
        Insert: {
          created_at?: string
          evidence_object_keys?: Json | null
          fulfillment_id: string
          id?: string
          lot_expiry_json?: Json | null
          notes?: string | null
          packaging_condition: Database["public"]["Enums"]["packaging_condition"]
          received_at?: string
          received_by: string
          received_weight_kg: number
          temperature_c?: number | null
        }
        Update: {
          created_at?: string
          evidence_object_keys?: Json | null
          fulfillment_id?: string
          id?: string
          lot_expiry_json?: Json | null
          notes?: string | null
          packaging_condition?: Database["public"]["Enums"]["packaging_condition"]
          received_at?: string
          received_by?: string
          received_weight_kg?: number
          temperature_c?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_receipts_fulfillment_id_fkey"
            columns: ["fulfillment_id"]
            isOneToOne: false
            referencedRelation: "fulfillments"
            referencedColumns: ["id"]
          },
        ]
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
      invoices: {
        Row: {
          amount_paid: number
          buyer_org_id: string
          created_at: string
          due_date: string
          id: string
          invoice_no: string
          issued_at: string
          issued_by: string | null
          notes: string | null
          order_id: string
          paid_at: string | null
          shipping_fee: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          buyer_org_id: string
          created_at?: string
          due_date: string
          id?: string
          invoice_no: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          order_id: string
          paid_at?: string | null
          shipping_fee: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          buyer_org_id?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_no?: string
          issued_at?: string
          issued_by?: string | null
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          {
            foreignKeyName: "kyb_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      market_insights: {
        Row: {
          body: string
          category: string
          confidence: string
          created_at: string
          created_by: string | null
          data_refs: Json
          display_rank: number | null
          id: string
          period_label: string | null
          region: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          confidence?: string
          created_at?: string
          created_by?: string | null
          data_refs?: Json
          display_rank?: number | null
          id?: string
          period_label?: string | null
          region?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          confidence?: string
          created_at?: string
          created_by?: string | null
          data_refs?: Json
          display_rank?: number | null
          id?: string
          period_label?: string | null
          region?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_metrics: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          metric_key: string
          notes: string | null
          observed_on: string
          region: string
          source: string
          unit: string | null
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          metric_key: string
          notes?: string | null
          observed_on?: string
          region?: string
          source?: string
          unit?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          metric_key?: string
          notes?: string | null
          observed_on?: string
          region?: string
          source?: string
          unit?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      ml_role_audit: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_role: Database["public"]["Enums"]["ml_role"] | null
          id: string
          reason: string | null
          target_user_id: string
          to_role: Database["public"]["Enums"]["ml_role"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_role?: Database["public"]["Enums"]["ml_role"] | null
          id?: string
          reason?: string | null
          target_user_id: string
          to_role: Database["public"]["Enums"]["ml_role"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_role?: Database["public"]["Enums"]["ml_role"] | null
          id?: string
          reason?: string | null
          target_user_id?: string
          to_role?: Database["public"]["Enums"]["ml_role"]
        }
        Relationships: []
      }
      ml_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["ml_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["ml_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["ml_role"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          read_at: string | null
          recipient_org_id: string | null
          recipient_user_id: string | null
          severity: string
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: string
          read_at?: string | null
          recipient_org_id?: string | null
          recipient_user_id?: string | null
          severity?: string
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          recipient_org_id?: string | null
          recipient_user_id?: string | null
          severity?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          offer_id: string
          order_id: string
          product_id: string
          qty_kg: number
          unit_price: number
          updated_at: string
          vendor_decided_at: string | null
          vendor_decided_by: string | null
          vendor_id: string
          vendor_reject_reason: string | null
          vendor_status: Database["public"]["Enums"]["order_line_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          offer_id: string
          order_id: string
          product_id: string
          qty_kg: number
          unit_price: number
          updated_at?: string
          vendor_decided_at?: string | null
          vendor_decided_by?: string | null
          vendor_id: string
          vendor_reject_reason?: string | null
          vendor_status?: Database["public"]["Enums"]["order_line_status"]
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          offer_id?: string
          order_id?: string
          product_id?: string
          qty_kg?: number
          unit_price?: number
          updated_at?: string
          vendor_decided_at?: string | null
          vendor_decided_by?: string | null
          vendor_id?: string
          vendor_reject_reason?: string | null
          vendor_status?: Database["public"]["Enums"]["order_line_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "vendor_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      order_state_history: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_state: Database["public"]["Enums"]["order_status"] | null
          id: string
          order_id: string
          reason: string | null
          to_state: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_state?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id: string
          reason?: string | null
          to_state: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_state?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id?: string
          reason?: string | null
          to_state?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_state_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          buyer_org_id: string
          created_at: string
          id: string
          notes: string | null
          order_no: string
          placed_at: string
          placed_by: string | null
          service_zone: Database["public"]["Enums"]["service_zone"] | null
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          total_kg: number
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          buyer_org_id: string
          created_at?: string
          id?: string
          notes?: string | null
          order_no: string
          placed_at?: string
          placed_by?: string | null
          service_zone?: Database["public"]["Enums"]["service_zone"] | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          total_kg?: number
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          buyer_org_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_no?: string
          placed_at?: string
          placed_by?: string | null
          service_zone?: Database["public"]["Enums"]["service_zone"] | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          total_kg?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
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
          {
            foreignKeyName: "org_state_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
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
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
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
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          payment_intent_id: string | null
          provider: string
          reference: string | null
          status: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          payment_intent_id?: string | null
          provider?: string
          reference?: string | null
          status?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          payment_intent_id?: string | null
          provider?: string
          reference?: string | null
          status?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          buyer_org_id: string | null
          buyer_user_id: string | null
          channel: string
          channel_code: string | null
          created_at: string
          expires_at: string | null
          fee: number
          id: string
          order_ref: string
          paid_at: string | null
          payment_name: string | null
          payment_no: string | null
          provider: string
          qr_string: string | null
          reference: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: Database["public"]["Enums"]["payment_intent_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_org_id?: string | null
          buyer_user_id?: string | null
          channel: string
          channel_code?: string | null
          created_at?: string
          expires_at?: string | null
          fee?: number
          id?: string
          order_ref: string
          paid_at?: string | null
          payment_name?: string | null
          payment_no?: string | null
          provider?: string
          qr_string?: string | null
          reference?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_intent_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_org_id?: string | null
          buyer_user_id?: string | null
          channel?: string
          channel_code?: string | null
          created_at?: string
          expires_at?: string | null
          fee?: number
          id?: string
          order_ref?: string
          paid_at?: string | null
          payment_name?: string | null
          payment_no?: string | null
          provider?: string
          qr_string?: string | null
          reference?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_intent_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          received_at: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          received_at?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          received_at?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
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
      qc_inspections: {
        Row: {
          checklist_json: Json
          created_at: string
          decision: Database["public"]["Enums"]["qc_decision"]
          evidence_object_keys: Json | null
          id: string
          inspected_at: string
          inspected_by: string
          notes: string | null
          packaging_condition:
            | Database["public"]["Enums"]["packaging_condition"]
            | null
          return_request_id: string
          vendor_fault: boolean | null
        }
        Insert: {
          checklist_json?: Json
          created_at?: string
          decision: Database["public"]["Enums"]["qc_decision"]
          evidence_object_keys?: Json | null
          id?: string
          inspected_at?: string
          inspected_by: string
          notes?: string | null
          packaging_condition?:
            | Database["public"]["Enums"]["packaging_condition"]
            | null
          return_request_id: string
          vendor_fault?: boolean | null
        }
        Update: {
          checklist_json?: Json
          created_at?: string
          decision?: Database["public"]["Enums"]["qc_decision"]
          evidence_object_keys?: Json | null
          id?: string
          inspected_at?: string
          inspected_by?: string
          notes?: string | null
          packaging_condition?:
            | Database["public"]["Enums"]["packaging_condition"]
            | null
          return_request_id?: string
          vendor_fault?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_inspections_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          brand_preference: string | null
          category: string | null
          company_name: string
          contact_name: string
          created_at: string
          current_price: string | null
          current_supplier: string | null
          delivery_location: string
          email: string | null
          grade: string | null
          id: string
          items: Json
          notes: string | null
          origin_preference: string | null
          payment_terms: string | null
          product_cut: string
          purchase_frequency: string | null
          required_delivery_date: string
          status: string
          target_price: string | null
          updated_at: string
          user_id: string | null
          volume: string
          whatsapp: string
        }
        Insert: {
          brand_preference?: string | null
          category?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          current_price?: string | null
          current_supplier?: string | null
          delivery_location: string
          email?: string | null
          grade?: string | null
          id?: string
          items?: Json
          notes?: string | null
          origin_preference?: string | null
          payment_terms?: string | null
          product_cut: string
          purchase_frequency?: string | null
          required_delivery_date: string
          status?: string
          target_price?: string | null
          updated_at?: string
          user_id?: string | null
          volume: string
          whatsapp: string
        }
        Update: {
          brand_preference?: string | null
          category?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          current_price?: string | null
          current_supplier?: string | null
          delivery_location?: string
          email?: string | null
          grade?: string | null
          id?: string
          items?: Json
          notes?: string | null
          origin_preference?: string | null
          payment_terms?: string | null
          product_cut?: string
          purchase_frequency?: string | null
          required_delivery_date?: string
          status?: string
          target_price?: string | null
          updated_at?: string
          user_id?: string | null
          volume?: string
          whatsapp?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          buyer_org_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          order_id: string
          recorded_by: string
          reference: string | null
          return_request_id: string
        }
        Insert: {
          amount: number
          buyer_org_id: string
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id: string
          recorded_by: string
          reference?: string | null
          return_request_id: string
        }
        Update: {
          amount?: number
          buyer_org_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string
          recorded_by?: string
          reference?: string | null
          return_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_return_request_id_fkey"
            columns: ["return_request_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          buyer_org_id: string
          created_at: string
          description: string | null
          eligibility_deadline: string
          evidence_object_keys: Json | null
          id: string
          order_id: string
          reason_code: string
          requested_at: string
          requested_by: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          return_number: string
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          buyer_org_id: string
          created_at?: string
          description?: string | null
          eligibility_deadline: string
          evidence_object_keys?: Json | null
          id?: string
          order_id: string
          reason_code: string
          requested_at?: string
          requested_by: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_number: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          buyer_org_id?: string
          created_at?: string
          description?: string | null
          eligibility_deadline?: string
          evidence_object_keys?: Json | null
          id?: string
          order_id?: string
          reason_code?: string
          requested_at?: string
          requested_by?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          return_number?: string
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_items: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          line_gross: number
          line_net: number
          order_id: string
          order_item_id: string
          settlement_id: string
          vendor_id: string
        }
        Insert: {
          commission_amount: number
          created_at?: string
          id?: string
          line_gross: number
          line_net: number
          order_id: string
          order_item_id: string
          settlement_id: string
          vendor_id: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          line_gross?: number
          line_net?: number
          order_id?: string
          order_item_id?: string
          settlement_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      settlements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          scheduled_date: string | null
          settlement_no: string
          status: Database["public"]["Enums"]["settlement_status"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          scheduled_date?: string | null
          settlement_no: string
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          scheduled_date?: string | null
          settlement_no?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      sp_warnings: {
        Row: {
          category: Database["public"]["Enums"]["sp_category"]
          created_at: string
          expires_at: string | null
          id: string
          issued_at: string
          issued_by: string | null
          reason: string
          related_entity: string | null
          related_entity_id: string | null
          related_order_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["sp_severity"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["sp_category"]
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          reason: string
          related_entity?: string | null
          related_entity_id?: string | null
          related_order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["sp_severity"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["sp_category"]
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          reason?: string
          related_entity?: string | null
          related_entity_id?: string | null
          related_order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["sp_severity"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sp_warnings_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sp_warnings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sp_warnings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
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
      storefront_order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status:
            | Database["public"]["Enums"]["ml_store_order_status"]
            | null
          id: string
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["ml_store_order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["ml_store_order_status"]
            | null
          id?: string
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["ml_store_order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["ml_store_order_status"]
            | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["ml_store_order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "storefront_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "storefront_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_order_items: {
        Row: {
          category: Database["public"]["Enums"]["ml_product_category"] | null
          created_at: string
          id: string
          inventory_id: string | null
          line_total_idr: number
          order_id: string
          product_name: string
          qty_kg: number
          slug: string | null
          unit_price_idr: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["ml_product_category"] | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          line_total_idr: number
          order_id: string
          product_name: string
          qty_kg: number
          slug?: string | null
          unit_price_idr: number
        }
        Update: {
          category?: Database["public"]["Enums"]["ml_product_category"] | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          line_total_idr?: number
          order_id?: string
          product_name?: string
          qty_kg?: number
          slug?: string | null
          unit_price_idr?: number
        }
        Relationships: [
          {
            foreignKeyName: "storefront_order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "admin_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "storefront_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_orders: {
        Row: {
          access_token: string
          address: string
          admin_note: string | null
          buyer_name: string
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          order_no: string
          payment_method: Database["public"]["Enums"]["ml_pay_method"]
          payment_ref: string | null
          phone: string
          status: Database["public"]["Enums"]["ml_store_order_status"]
          stock_deducted_at: string | null
          subtotal_idr: number
          total_idr: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token?: string
          address: string
          admin_note?: string | null
          buyer_name: string
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          order_no: string
          payment_method: Database["public"]["Enums"]["ml_pay_method"]
          payment_ref?: string | null
          phone: string
          status?: Database["public"]["Enums"]["ml_store_order_status"]
          stock_deducted_at?: string | null
          subtotal_idr?: number
          total_idr?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          address?: string
          admin_note?: string | null
          buyer_name?: string
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          order_no?: string
          payment_method?: Database["public"]["Enums"]["ml_pay_method"]
          payment_ref?: string | null
          phone?: string
          status?: Database["public"]["Enums"]["ml_store_order_status"]
          stock_deducted_at?: string | null
          subtotal_idr?: number
          total_idr?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      supplier_applications: {
        Row: {
          brands_represented: string | null
          company_name: string
          contact_name: string
          created_at: string
          delivery_coverage: string | null
          email: string | null
          id: string
          moq: string | null
          notes: string | null
          origins: string | null
          payment_terms: string | null
          product_categories: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          brands_represented?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          delivery_coverage?: string | null
          email?: string | null
          id?: string
          moq?: string | null
          notes?: string | null
          origins?: string | null
          payment_terms?: string | null
          product_categories?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          brands_represented?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          delivery_coverage?: string | null
          email?: string | null
          id?: string
          moq?: string | null
          notes?: string | null
          origins?: string | null
          payment_terms?: string | null
          product_categories?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
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
          {
            foreignKeyName: "vendor_offers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_reliability"
            referencedColumns: ["vendor_id"]
          },
        ]
      }
      vendor_products: {
        Row: {
          category: Database["public"]["Enums"]["ml_product_category"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          qty_kg: number
          updated_at: string
          vendor_user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["ml_product_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          qty_kg?: number
          updated_at?: string
          vendor_user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ml_product_category"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          qty_kg?: number
          updated_at?: string
          vendor_user_id?: string
        }
        Relationships: []
      }
      vendor_stock_movements: {
        Row: {
          actor_user_id: string | null
          created_at: string
          delta_kg: number
          id: number
          product_id: string
          qty_after: number
          source: string
          vendor_user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          delta_kg: number
          id?: number
          product_id: string
          qty_after: number
          source?: string
          vendor_user_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          delta_kg?: number
          id?: number
          product_id?: string
          qty_after?: number
          source?: string
          vendor_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vendor_reliability: {
        Row: {
          active_sp5: number | null
          active_warnings: number | null
          display_name: string | null
          last_issued_at: string | null
          reliability_score: number | null
          vendor_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _caller_may_inspect: { Args: { _user_id: string }; Returns: boolean }
      _role_check_internal: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      approve_settlement: { Args: { _id: string }; Returns: undefined }
      assign_courier: {
        Args: { _courier: string; _job_id: string; _vehicle?: string }
        Returns: undefined
      }
      cancel_order: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
      checkout_cart: { Args: { _notes?: string }; Returns: string }
      close_return: {
        Args: { _resolution: string; _return_id: string }
        Returns: undefined
      }
      courier_complete_delivery: {
        Args: { _job_id: string; _proof: Json }
        Returns: undefined
      }
      courier_post_location: {
        Args: {
          _accuracy?: number
          _job_id: string
          _lat: number
          _lng: number
          _speed?: number
        }
        Returns: undefined
      }
      courier_start_delivery: { Args: { _job_id: string }; Returns: undefined }
      create_delivery_job: {
        Args: { _fulfillment_id: string; _scheduled: string }
        Returns: string
      }
      create_organization: {
        Args: {
          _display_name: string
          _legal_name: string
          _type: Database["public"]["Enums"]["org_type"]
        }
        Returns: string
      }
      generate_settlements: {
        Args: { _commission_rate?: number; _period_end?: string }
        Returns: number
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
      hub_receive: {
        Args: {
          _evidence?: Json
          _fulfillment_id: string
          _lot_expiry?: Json
          _notes?: string
          _packaging: Database["public"]["Enums"]["packaging_condition"]
          _temperature: number
          _weight: number
        }
        Returns: string
      }
      is_internal: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      issue_invoice: { Args: { _order_id: string }; Returns: string }
      issue_sp_warning: {
        Args: {
          _category: Database["public"]["Enums"]["sp_category"]
          _expires_at?: string
          _reason: string
          _related_order_id?: string
          _severity: Database["public"]["Enums"]["sp_severity"]
          _vendor_id: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: { Args: { _id: string }; Returns: undefined }
      mark_settlement_paid: {
        Args: { _id: string; _reference: string }
        Returns: undefined
      }
      ml_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["ml_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ml_market_snapshot: { Args: { _days?: number }; Returns: Json }
      ml_next_order_no: { Args: never; Returns: string }
      ml_next_store_order_no: { Args: never; Returns: string }
      ml_normalise_region: { Args: { _raw: string }; Returns: string }
      ml_place_order: {
        Args: {
          _buyer: Json
          _items: Json
          _payment_method: Database["public"]["Enums"]["ml_pay_method"]
        }
        Returns: {
          access_token: string
          id: string
          order_no: string
          total_idr: number
        }[]
      }
      ml_public_catalog: {
        Args: {
          _category?: Database["public"]["Enums"]["ml_product_category"]
          _limit?: number
          _offset?: number
          _origin?: string
          _search?: string
        }
        Returns: {
          availability: string
          avg_weight_text: string
          brand: string
          category: Database["public"]["Enums"]["ml_product_category"]
          condition: string
          id: string
          image_url: string
          name: string
          origin: string
          public_price_idr: number
          slug: string
          total_count: number
        }[]
      }
      ml_public_featured: {
        Args: { _limit?: number }
        Returns: {
          avg_weight_text: string
          brand: string
          condition: string
          featured_rank: number
          id: string
          image_url: string
          name: string
          origin: string
          public_price_idr: number
        }[]
      }
      ml_public_product: {
        Args: { _slug: string }
        Returns: {
          availability: string
          avg_weight_kg: number
          avg_weight_text: string
          brand: string
          category: Database["public"]["Enums"]["ml_product_category"]
          condition: string
          description: string
          id: string
          image_url: string
          name: string
          origin: string
          public_price_idr: number
          slug: string
        }[]
      }
      ml_public_stock: {
        Args: never
        Returns: {
          category: Database["public"]["Enums"]["ml_product_category"]
          last_updated_at: string
          product_name: string
          qty_kg: number
          source_count: number
        }[]
      }
      ml_set_user_role: {
        Args: {
          _reason?: string
          _role: Database["public"]["Enums"]["ml_role"]
          _user_id: string
        }
        Returns: undefined
      }
      ml_slugify: { Args: { _text: string }; Returns: string }
      ml_track_order: {
        Args: { _order_no: string; _token: string }
        Returns: Json
      }
      ml_update_store_order: {
        Args: {
          _note?: string
          _order_id: string
          _payment_ref?: string
          _status: Database["public"]["Enums"]["ml_store_order_status"]
        }
        Returns: undefined
      }
      next_invoice_no: { Args: never; Returns: string }
      next_order_no: { Args: never; Returns: string }
      next_queue_no: { Args: { _date: string }; Returns: string }
      next_return_no: { Args: never; Returns: string }
      next_settlement_no: { Args: never; Returns: string }
      notify: {
        Args: {
          _body: string
          _entity_id: string
          _entity_type: string
          _kind: string
          _org_id: string
          _severity?: string
          _title: string
          _url: string
          _user_id: string
        }
        Returns: undefined
      }
      process_return_refund: {
        Args: {
          _amount: number
          _method: Database["public"]["Enums"]["payment_method"]
          _notes?: string
          _reference?: string
          _return_id: string
        }
        Returns: string
      }
      qc_decide: {
        Args: {
          _checklist?: Json
          _decision: Database["public"]["Enums"]["qc_decision"]
          _evidence?: Json
          _notes?: string
          _packaging?: Database["public"]["Enums"]["packaging_condition"]
          _return_id: string
          _vendor_fault?: boolean
        }
        Returns: string
      }
      record_payment: {
        Args: {
          _amount: number
          _invoice_id: string
          _method: Database["public"]["Enums"]["payment_method"]
          _notes?: string
          _reference?: string
        }
        Returns: string
      }
      request_return: {
        Args: {
          _description?: string
          _evidence?: Json
          _order_id: string
          _reason: string
        }
        Returns: string
      }
      resolve_sp_warning: {
        Args: { _id: string; _notes: string }
        Returns: undefined
      }
      review_organization: {
        Args: { _decision: string; _org_id: string; _reason?: string }
        Returns: undefined
      }
      set_feature_flag: {
        Args: { _description?: string; _enabled: boolean; _key: string }
        Returns: undefined
      }
      submit_organization: { Args: { _org_id: string }; Returns: undefined }
      vendor_decide_order_item: {
        Args: { _decision: string; _item_id: string; _reason?: string }
        Returns: undefined
      }
      vendor_dispatch_to_hub: {
        Args: { _fulfillment_id: string; _notes?: string }
        Returns: undefined
      }
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
      cart_status: "ACTIVE" | "CHECKED_OUT" | "ABANDONED"
      catalog_status: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "ARCHIVED"
      delivery_status:
        | "PENDING_ASSIGNMENT"
        | "ASSIGNED"
        | "STARTED"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "FAILED"
        | "CANCELLED"
      evidence_status: "PENDING" | "APPROVED" | "REJECTED"
      evidence_type: "AWARD" | "ASSOCIATION" | "QC" | "DISCLOSURE"
      fulfillment_status:
        | "AWAITING_VENDOR_DISPATCH"
        | "AWAITING_HUB_INBOUND"
        | "HUB_RECEIVED"
        | "READY_FOR_DISPATCH"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "EXCEPTION"
        | "CANCELLED"
      invoice_status: "ISSUED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "VOID"
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
      ml_order_status:
        | "PENDING"
        | "CONFIRMED"
        | "ON_HOLD"
        | "REJECTED"
        | "DELIVERED"
      ml_pay_method: "BANK_TRANSFER" | "QRIS" | "WHATSAPP" | "CBD"
      ml_payment_term: "CBD" | "TOP7" | "TOP14" | "TOP30"
      ml_product_category: "PRIME_CUT" | "SECOND_CUT" | "OFFAL" | "BONE"
      ml_role: "buyer" | "vendor" | "admin"
      ml_store_order_status:
        | "NEW"
        | "AWAITING_PAYMENT"
        | "PAID"
        | "PROCESSING"
        | "SHIPPED"
        | "COMPLETED"
        | "CANCELLED"
      ml_top_decision: "APPROVE" | "CUT" | "FORWARD"
      order_line_status: "PENDING" | "CONFIRMED" | "REJECTED"
      order_status:
        | "PLACED"
        | "VENDOR_REVIEW"
        | "CONFIRMED"
        | "PARTIALLY_CONFIRMED"
        | "REJECTED"
        | "CANCELLED"
        | "FULFILLING"
        | "DELIVERED"
        | "CLOSED"
      org_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "SUSPENDED"
      org_type: "BUYER" | "VENDOR" | "INTERNAL"
      packaging_condition:
        | "GOOD"
        | "MINOR_DAMAGE"
        | "MAJOR_DAMAGE"
        | "TEMPERATURE_BREACH"
      payment_intent_status:
        | "PENDING"
        | "PROCESSING"
        | "PAID"
        | "FAILED"
        | "EXPIRED"
        | "CANCELLED"
      payment_method: "BANK_TRANSFER" | "VA" | "CASH" | "OTHER"
      product_tier:
        | "COMMODITY_PREMIUM"
        | "SUPER_PREMIUM"
        | "UNDERVALUED_QC"
        | "MEATHUB_HOUSE"
      purchase_type: "LOAF" | "CARTON" | "RETAIL"
      qc_decision: "APPROVED" | "REJECTED" | "NEEDS_EVIDENCE"
      return_status:
        | "REQUESTED"
        | "RECEIVED_AT_HUB"
        | "QC_IN_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "REFUNDED"
        | "CANCELLED"
        | "CLOSED"
      service_zone: "JKT_INNER" | "JKT_OUTER" | "BODETABEK" | "OUT_OF_ZONE"
      settlement_status: "DRAFT" | "APPROVED" | "PAID" | "CANCELLED"
      sp_category:
        | "ORDER_REJECTION"
        | "LATE_DISPATCH"
        | "QC_FAIL"
        | "RETURN_VENDOR_FAULT"
        | "DOCUMENT_MISSING"
        | "POLICY_VIOLATION"
        | "OTHER"
      sp_severity: "SP1" | "SP2" | "SP3" | "SP4" | "SP5"
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
      cart_status: ["ACTIVE", "CHECKED_OUT", "ABANDONED"],
      catalog_status: ["DRAFT", "REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"],
      delivery_status: [
        "PENDING_ASSIGNMENT",
        "ASSIGNED",
        "STARTED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "FAILED",
        "CANCELLED",
      ],
      evidence_status: ["PENDING", "APPROVED", "REJECTED"],
      evidence_type: ["AWARD", "ASSOCIATION", "QC", "DISCLOSURE"],
      fulfillment_status: [
        "AWAITING_VENDOR_DISPATCH",
        "AWAITING_HUB_INBOUND",
        "HUB_RECEIVED",
        "READY_FOR_DISPATCH",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "EXCEPTION",
        "CANCELLED",
      ],
      invoice_status: ["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"],
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
      ml_order_status: [
        "PENDING",
        "CONFIRMED",
        "ON_HOLD",
        "REJECTED",
        "DELIVERED",
      ],
      ml_pay_method: ["BANK_TRANSFER", "QRIS", "WHATSAPP", "CBD"],
      ml_payment_term: ["CBD", "TOP7", "TOP14", "TOP30"],
      ml_product_category: ["PRIME_CUT", "SECOND_CUT", "OFFAL", "BONE"],
      ml_role: ["buyer", "vendor", "admin"],
      ml_store_order_status: [
        "NEW",
        "AWAITING_PAYMENT",
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "COMPLETED",
        "CANCELLED",
      ],
      ml_top_decision: ["APPROVE", "CUT", "FORWARD"],
      order_line_status: ["PENDING", "CONFIRMED", "REJECTED"],
      order_status: [
        "PLACED",
        "VENDOR_REVIEW",
        "CONFIRMED",
        "PARTIALLY_CONFIRMED",
        "REJECTED",
        "CANCELLED",
        "FULFILLING",
        "DELIVERED",
        "CLOSED",
      ],
      org_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
      ],
      org_type: ["BUYER", "VENDOR", "INTERNAL"],
      packaging_condition: [
        "GOOD",
        "MINOR_DAMAGE",
        "MAJOR_DAMAGE",
        "TEMPERATURE_BREACH",
      ],
      payment_intent_status: [
        "PENDING",
        "PROCESSING",
        "PAID",
        "FAILED",
        "EXPIRED",
        "CANCELLED",
      ],
      payment_method: ["BANK_TRANSFER", "VA", "CASH", "OTHER"],
      product_tier: [
        "COMMODITY_PREMIUM",
        "SUPER_PREMIUM",
        "UNDERVALUED_QC",
        "MEATHUB_HOUSE",
      ],
      purchase_type: ["LOAF", "CARTON", "RETAIL"],
      qc_decision: ["APPROVED", "REJECTED", "NEEDS_EVIDENCE"],
      return_status: [
        "REQUESTED",
        "RECEIVED_AT_HUB",
        "QC_IN_REVIEW",
        "APPROVED",
        "REJECTED",
        "REFUNDED",
        "CANCELLED",
        "CLOSED",
      ],
      service_zone: ["JKT_INNER", "JKT_OUTER", "BODETABEK", "OUT_OF_ZONE"],
      settlement_status: ["DRAFT", "APPROVED", "PAID", "CANCELLED"],
      sp_category: [
        "ORDER_REJECTION",
        "LATE_DISPATCH",
        "QC_FAIL",
        "RETURN_VENDOR_FAULT",
        "DOCUMENT_MISSING",
        "POLICY_VIOLATION",
        "OTHER",
      ],
      sp_severity: ["SP1", "SP2", "SP3", "SP4", "SP5"],
    },
  },
} as const

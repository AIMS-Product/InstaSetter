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
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          created_at: string
          email: string | null
          first_seen_at: string
          id: string
          instagram_handle: string
          last_message_at: string
          name: string | null
          opted_out: boolean
          opted_out_at: string | null
          phone: string | null
          profile_picture_url: string | null
          sendpulse_contact_id: string | null
          source: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          instagram_handle: string
          last_message_at?: string
          name?: string | null
          opted_out?: boolean
          opted_out_at?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          sendpulse_contact_id?: string | null
          source?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          instagram_handle?: string
          last_message_at?: string
          name?: string | null
          opted_out?: boolean
          opted_out_at?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          sendpulse_contact_id?: string | null
          source?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          contact_id: string
          created_at: string
          ended_at: string | null
          flagged_reason: string | null
          flow_id: string | null
          flow_version_id: string | null
          id: string
          is_test: boolean
          prompt_version: string
          started_at: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          ended_at?: string | null
          flagged_reason?: string | null
          flow_id?: string | null
          flow_version_id?: string | null
          id?: string
          is_test?: boolean
          prompt_version: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          ended_at?: string | null
          flagged_reason?: string | null
          flow_id?: string | null
          flow_version_id?: string | null
          id?: string
          is_test?: boolean
          prompt_version?: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
        ]
      }
      flow_runtime_controls: {
        Row: {
          bot_paused: boolean
          flow_id: string
          paused_until: string | null
          updated_at: string
        }
        Insert: {
          bot_paused?: boolean
          flow_id: string
          paused_until?: string | null
          updated_at?: string
        }
        Update: {
          bot_paused?: boolean
          flow_id?: string
          paused_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_events: {
        Row: {
          action: string
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          integration: string
          lead_id: string | null
          payload: Json | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
        }
        Insert: {
          action: string
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration: string
          lead_id?: string | null
          payload?: Json | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
        }
        Update: {
          action?: string
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          integration?: string
          lead_id?: string | null
          payload?: Json | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'integration_events_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'integration_events_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'integration_events_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
        ]
      }
      ins_feature_flags: {
        Row: {
          enabled: boolean
          id: string
          key: string
          scope: string
          scope_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          key: string
          scope: string
          scope_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          key?: string
          scope?: string
          scope_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ins_feature_flags_audit: {
        Row: {
          action: string
          actor: string | null
          brand: string
          created_at: string
          flag_id: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          brand: string
          created_at?: string
          flag_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          brand?: string
          created_at?: string
          flag_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ins_feature_flags_audit_flag_id_fkey'
            columns: ['flag_id']
            isOneToOne: false
            referencedRelation: 'ins_feature_flags'
            referencedColumns: ['id']
          },
        ]
      }
      ins_flow_channels: {
        Row: {
          active_version_id: string | null
          brand: string
          channel: string
          flow_id: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_version_id?: string | null
          brand: string
          channel?: string
          flow_id: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_version_id?: string | null
          brand?: string
          channel?: string
          flow_id?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ins_flow_channels_active_version_id_fkey'
            columns: ['active_version_id']
            isOneToOne: false
            referencedRelation: 'ins_flow_versions'
            referencedColumns: ['id']
          },
        ]
      }
      ins_flow_drafts: {
        Row: {
          booking_url: string | null
          brand: string
          created_at: string
          flow_id: string
          id: string
          schema_version: number
          state: Json
          updated_at: string
        }
        Insert: {
          booking_url?: string | null
          brand: string
          created_at?: string
          flow_id: string
          id?: string
          schema_version?: number
          state: Json
          updated_at?: string
        }
        Update: {
          booking_url?: string | null
          brand?: string
          created_at?: string
          flow_id?: string
          id?: string
          schema_version?: number
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ins_flow_draft_versions: {
        Row: {
          brand: string
          created_at: string
          created_by: string | null
          flow_id: string
          id: string
          reason: string | null
          schema_version: number
          state: Json
          version_number: number
        }
        Insert: {
          brand: string
          created_at?: string
          created_by?: string | null
          flow_id: string
          id?: string
          reason?: string | null
          schema_version?: number
          state: Json
          version_number: number
        }
        Update: {
          brand?: string
          created_at?: string
          created_by?: string | null
          flow_id?: string
          id?: string
          reason?: string | null
          schema_version?: number
          state?: Json
          version_number?: number
        }
        Relationships: []
      }
      ins_flow_draft_audit: {
        Row: {
          action: string
          actor_email: string | null
          brand: string
          changed_field_ids: string[]
          created_at: string
          flow_id: string
          id: string
          reason: string | null
          version_number: number | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          brand: string
          changed_field_ids?: string[]
          created_at?: string
          flow_id: string
          id?: string
          reason?: string | null
          version_number?: number | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          brand?: string
          changed_field_ids?: string[]
          created_at?: string
          flow_id?: string
          id?: string
          reason?: string | null
          version_number?: number | null
        }
        Relationships: []
      }
      ins_flow_publish_log: {
        Row: {
          action: string
          actor: string | null
          brand: string
          created_at: string
          flow_id: string
          id: string
          note: string | null
          version_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          brand: string
          created_at?: string
          flow_id: string
          id?: string
          note?: string | null
          version_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          brand?: string
          created_at?: string
          flow_id?: string
          id?: string
          note?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ins_flow_publish_log_version_id_fkey'
            columns: ['version_id']
            isOneToOne: false
            referencedRelation: 'ins_flow_versions'
            referencedColumns: ['id']
          },
        ]
      }
      ins_flow_versions: {
        Row: {
          brand: string
          checksum: string
          compiled: Json
          flow_id: string
          id: string
          note: string | null
          published_at: string
          published_by: string | null
          source: string
          state: Json
          version_number: number
        }
        Insert: {
          brand: string
          checksum: string
          compiled: Json
          flow_id: string
          id?: string
          note?: string | null
          published_at?: string
          published_by?: string | null
          source?: string
          state: Json
          version_number: number
        }
        Update: {
          brand?: string
          checksum?: string
          compiled?: Json
          flow_id?: string
          id?: string
          note?: string | null
          published_at?: string
          published_by?: string | null
          source?: string
          state?: Json
          version_number?: number
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          contact_id: string
          conversation_id: string
          created_at: string
          id: string
          integration: string
          message_id: string | null
          tool_input: Json
          tool_name: string
          tool_use_id: string | null
        }
        Insert: {
          contact_id: string
          conversation_id: string
          created_at?: string
          id?: string
          integration?: string
          message_id?: string | null
          tool_input?: Json
          tool_name: string
          tool_use_id?: string | null
        }
        Update: {
          contact_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          integration?: string
          message_id?: string | null
          tool_input?: Json
          tool_name?: string
          tool_use_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'lead_events_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_events_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lead_events_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'messages'
            referencedColumns: ['id']
          },
        ]
      }
      marketing_sources: {
        Row: {
          ad_id: string | null
          ad_set_id: string | null
          campaign: string
          channel: string
          created_at: string
          entry_action: string
          id: string
          label: string
          landing_page_url: string | null
          material: string
          notes: string | null
          post_url: string | null
          source_key: string
          status: string
          trigger_label: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_set_id?: string | null
          campaign: string
          channel: string
          created_at?: string
          entry_action: string
          id?: string
          label: string
          landing_page_url?: string | null
          material: string
          notes?: string | null
          post_url?: string | null
          source_key: string
          status?: string
          trigger_label: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_set_id?: string | null
          campaign?: string
          channel?: string
          created_at?: string
          entry_action?: string
          id?: string
          label?: string
          landing_page_url?: string | null
          material?: string
          notes?: string | null
          post_url?: string | null
          source_key?: string
          status?: string
          trigger_label?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      conversation_attributions: {
        Row: {
          ad_id: string | null
          ad_set_id: string | null
          campaign: string | null
          channel: string | null
          conversation_id: string
          created_at: string
          entry_action: string | null
          landing_page_url: string | null
          material: string | null
          raw_message_id: string | null
          source_id: string | null
          source_key: string | null
          trigger_label: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_set_id?: string | null
          campaign?: string | null
          channel?: string | null
          conversation_id: string
          created_at?: string
          entry_action?: string | null
          landing_page_url?: string | null
          material?: string | null
          raw_message_id?: string | null
          source_id?: string | null
          source_key?: string | null
          trigger_label?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_set_id?: string | null
          campaign?: string | null
          channel?: string | null
          conversation_id?: string
          created_at?: string
          entry_action?: string | null
          landing_page_url?: string | null
          material?: string | null
          raw_message_id?: string | null
          source_id?: string | null
          source_key?: string | null
          trigger_label?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'conversation_attributions_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: true
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversation_attributions_source_id_fkey'
            columns: ['source_id']
            isOneToOne: false
            referencedRelation: 'marketing_sources'
            referencedColumns: ['id']
          },
        ]
      }
      ins_feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          key: string
          scope: string
          scope_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          key: string
          scope: string
          scope_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          key?: string
          scope?: string
          scope_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          calculator_sent: boolean
          calendly_slot: string | null
          call_booked: boolean
          call_outcome: string | null
          call_outcome_at: string | null
          call_outcome_notes: string | null
          close_crm_id: string | null
          close_sync_attempted_at: string | null
          close_sync_attempts: number
          close_sync_error_message: string | null
          close_sync_status: string
          contact_id: string
          conversation_id: string
          created_at: string
          customerio_id: string | null
          email: string | null
          id: string
          instagram_handle: string
          key_notes: string | null
          location_type: string | null
          machine_count: number | null
          name: string | null
          qualification_status: string
          recommended_action: string | null
          revenue_range: string | null
          summary_json: Json | null
          updated_at: string
        }
        Insert: {
          calculator_sent?: boolean
          calendly_slot?: string | null
          call_booked?: boolean
          call_outcome?: string | null
          call_outcome_at?: string | null
          call_outcome_notes?: string | null
          close_crm_id?: string | null
          close_sync_attempted_at?: string | null
          close_sync_attempts?: number
          close_sync_error_message?: string | null
          close_sync_status?: string
          contact_id: string
          conversation_id: string
          created_at?: string
          customerio_id?: string | null
          email?: string | null
          id?: string
          instagram_handle: string
          key_notes?: string | null
          location_type?: string | null
          machine_count?: number | null
          name?: string | null
          qualification_status?: string
          recommended_action?: string | null
          revenue_range?: string | null
          summary_json?: Json | null
          updated_at?: string
        }
        Update: {
          calculator_sent?: boolean
          calendly_slot?: string | null
          call_booked?: boolean
          call_outcome?: string | null
          call_outcome_at?: string | null
          call_outcome_notes?: string | null
          close_crm_id?: string | null
          close_sync_attempted_at?: string | null
          close_sync_attempts?: number
          close_sync_error_message?: string | null
          close_sync_status?: string
          contact_id?: string
          conversation_id?: string
          created_at?: string
          customerio_id?: string | null
          email?: string | null
          id?: string
          instagram_handle?: string
          key_notes?: string | null
          location_type?: string | null
          machine_count?: number | null
          name?: string | null
          qualification_status?: string
          recommended_action?: string | null
          revenue_range?: string | null
          summary_json?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      mc_bot_fields: {
        Row: {
          description: string | null
          id: number
          name: string
          synced_at: string
          type: string
          value: string | null
        }
        Insert: {
          description?: string | null
          id: number
          name: string
          synced_at?: string
          type: string
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
          synced_at?: string
          type?: string
          value?: string | null
        }
        Relationships: []
      }
      mc_contact_custom_fields: {
        Row: {
          contact_id: string
          field_id: number
          synced_at: string
          value: string | null
        }
        Insert: {
          contact_id: string
          field_id: number
          synced_at?: string
          value?: string | null
        }
        Update: {
          contact_id?: string
          field_id?: number
          synced_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mc_contact_custom_fields_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'mc_contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mc_contact_custom_fields_field_id_fkey'
            columns: ['field_id']
            isOneToOne: false
            referencedRelation: 'mc_custom_fields'
            referencedColumns: ['id']
          },
        ]
      }
      mc_contact_tags: {
        Row: {
          contact_id: string
          synced_at: string
          tag_id: number
        }
        Insert: {
          contact_id: string
          synced_at?: string
          tag_id: number
        }
        Update: {
          contact_id?: string
          synced_at?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'mc_contact_tags_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'mc_contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mc_contact_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'mc_tags'
            referencedColumns: ['id']
          },
        ]
      }
      mc_contacts: {
        Row: {
          email: string | null
          first_name: string | null
          gender: string | null
          id: string
          ig_id: number | null
          ig_last_interaction: string | null
          ig_last_seen: string | null
          ig_username: string | null
          is_followup_enabled: boolean | null
          language: string | null
          last_input_text: string | null
          last_interaction: string | null
          last_name: string | null
          last_seen: string | null
          live_chat_url: string | null
          locale: string | null
          manychat_status: string
          name: string | null
          optin_email: boolean | null
          optin_phone: boolean | null
          optin_whatsapp: boolean | null
          phone: string | null
          profile_pic: string | null
          subscribed: string | null
          synced_at: string
          timezone: string | null
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          ig_id?: number | null
          ig_last_interaction?: string | null
          ig_last_seen?: string | null
          ig_username?: string | null
          is_followup_enabled?: boolean | null
          language?: string | null
          last_input_text?: string | null
          last_interaction?: string | null
          last_name?: string | null
          last_seen?: string | null
          live_chat_url?: string | null
          locale?: string | null
          manychat_status?: string
          name?: string | null
          optin_email?: boolean | null
          optin_phone?: boolean | null
          optin_whatsapp?: boolean | null
          phone?: string | null
          profile_pic?: string | null
          subscribed?: string | null
          synced_at?: string
          timezone?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          email?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          ig_id?: number | null
          ig_last_interaction?: string | null
          ig_last_seen?: string | null
          ig_username?: string | null
          is_followup_enabled?: boolean | null
          language?: string | null
          last_input_text?: string | null
          last_interaction?: string | null
          last_name?: string | null
          last_seen?: string | null
          live_chat_url?: string | null
          locale?: string | null
          manychat_status?: string
          name?: string | null
          optin_email?: boolean | null
          optin_phone?: boolean | null
          optin_whatsapp?: boolean | null
          phone?: string | null
          profile_pic?: string | null
          subscribed?: string | null
          synced_at?: string
          timezone?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      mc_custom_fields: {
        Row: {
          description: string | null
          id: number
          name: string
          synced_at: string
          type: string
        }
        Insert: {
          description?: string | null
          id: number
          name: string
          synced_at?: string
          type: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
          synced_at?: string
          type?: string
        }
        Relationships: []
      }
      mc_flow_folders: {
        Row: {
          id: number
          name: string
          parent_id: number | null
          synced_at: string
        }
        Insert: {
          id: number
          name: string
          parent_id?: number | null
          synced_at?: string
        }
        Update: {
          id?: number
          name?: string
          parent_id?: number | null
          synced_at?: string
        }
        Relationships: []
      }
      mc_flows: {
        Row: {
          folder_id: number | null
          name: string
          ns: string
          synced_at: string
        }
        Insert: {
          folder_id?: number | null
          name: string
          ns: string
          synced_at?: string
        }
        Update: {
          folder_id?: number | null
          name?: string
          ns?: string
          synced_at?: string
        }
        Relationships: []
      }
      mc_growth_tools: {
        Row: {
          id: number
          name: string
          synced_at: string
          type: string
        }
        Insert: {
          id: number
          name: string
          synced_at?: string
          type: string
        }
        Update: {
          id?: number
          name?: string
          synced_at?: string
          type?: string
        }
        Relationships: []
      }
      mc_tags: {
        Row: {
          id: number
          name: string
          synced_at: string
        }
        Insert: {
          id: number
          name: string
          synced_at?: string
        }
        Update: {
          id?: number
          name?: string
          synced_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          dedup_hash: string | null
          external_message_id: string | null
          id: string
          metadata: Json | null
          role: string
          token_count: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          dedup_hash?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json | null
          role: string
          token_count?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          dedup_hash?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_creative_funnel: {
        Row: {
          conversation_id: string
          started_at: string
          source_id: string | null
          source_label: string | null
          channel: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          ad_id: string | null
          ad_set_id: string | null
          is_qualified: boolean
          is_booked: boolean
          is_sent_to_close: boolean
        }
        Relationships: []
      }
    }
    Functions: {
      ins_publish_flow: {
        Args: {
          p_brand: string
          p_flow_id: string
          p_channel: string
          p_state: Json
          p_compiled: Json
          p_checksum: string
          p_source: string
          p_note: string | null
          p_published_by: string | null
        }
        Returns: string
      }
      ins_set_feature_flag: {
        Args: {
          p_key: string
          p_scope: string
          p_scope_id: string | null
          p_enabled: boolean
          p_actor: string
          p_reason: string | null
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

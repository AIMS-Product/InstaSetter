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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

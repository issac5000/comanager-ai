export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      connected_accounts: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          org_id: string | null
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          token_expires_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_mix: {
        Row: {
          id: string
          org_id: string | null
          post_type_id: string | null
          posts_per_week: number | null
        }
        Insert: {
          id?: string
          org_id?: string | null
          post_type_id?: string | null
          posts_per_week?: number | null
        }
        Update: {
          id?: string
          org_id?: string | null
          post_type_id?: string | null
          posts_per_week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_mix_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_mix_post_type_id_fkey"
            columns: ["post_type_id"]
            isOneToOne: false
            referencedRelation: "post_types"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          default_hashtags: string[] | null
          default_tone: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          default_hashtags?: string[] | null
          default_tone?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          default_hashtags?: string[] | null
          default_tone?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string | null
          filename: string | null
          id: string
          org_id: string | null
          storage_path: string
          tags: string[] | null
          used_count: number | null
        }
        Insert: {
          created_at?: string | null
          filename?: string | null
          id?: string
          org_id?: string | null
          storage_path: string
          tags?: string[] | null
          used_count?: number | null
        }
        Update: {
          created_at?: string | null
          filename?: string | null
          id?: string
          org_id?: string | null
          storage_path?: string
          tags?: string[] | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          org_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          brand_voice: string | null
          created_at: string | null
          id: string
          industry_id: string | null
          logo_url: string | null
          name: string
          timezone: string | null
          topics_exclude: string[] | null
          topics_include: string[] | null
          updated_at: string | null
        }
        Insert: {
          brand_voice?: string | null
          created_at?: string | null
          id?: string
          industry_id?: string | null
          logo_url?: string | null
          name: string
          timezone?: string | null
          topics_exclude?: string[] | null
          topics_include?: string[] | null
          updated_at?: string | null
        }
        Update: {
          brand_voice?: string | null
          created_at?: string | null
          id?: string
          industry_id?: string | null
          logo_url?: string | null
          name?: string
          timezone?: string | null
          topics_exclude?: string[] | null
          topics_include?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      post_types: {
        Row: {
          description: string | null
          id: string
          name: string
          requires_image: boolean | null
          slug: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          requires_image?: boolean | null
          slug: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          requires_image?: boolean | null
          slug?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          caption: string | null
          created_at: string | null
          generated_image_url: string | null
          generated_images: string[] | null
          hashtags: string[] | null
          id: string
          meta_post_id: string | null
          org_id: string | null
          platforms: string[] | null
          post_type_id: string | null
          published_at: string | null
          review_feedback: string | null
          scheduled_for: string | null
          source_media_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          generated_image_url?: string | null
          generated_images?: string[] | null
          hashtags?: string[] | null
          id?: string
          meta_post_id?: string | null
          org_id?: string | null
          platforms?: string[] | null
          post_type_id?: string | null
          published_at?: string | null
          review_feedback?: string | null
          scheduled_for?: string | null
          source_media_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          generated_image_url?: string | null
          generated_images?: string[] | null
          hashtags?: string[] | null
          id?: string
          meta_post_id?: string | null
          org_id?: string | null
          platforms?: string[] | null
          post_type_id?: string | null
          published_at?: string | null
          review_feedback?: string | null
          scheduled_for?: string | null
          source_media_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_post_type_id_fkey"
            columns: ["post_type_id"]
            isOneToOne: false
            referencedRelation: "post_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_source_media_id_fkey"
            columns: ["source_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_settings: {
        Row: {
          auto_publish: boolean | null
          frequency: string | null
          id: string
          org_id: string | null
          preferred_time: string | null
        }
        Insert: {
          auto_publish?: boolean | null
          frequency?: string | null
          id?: string
          org_id?: string | null
          preferred_time?: string | null
        }
        Update: {
          auto_publish?: boolean | null
          frequency?: string | null
          id?: string
          org_id?: string | null
          preferred_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          active: boolean;
          created_at: string;
          email: string;
          name: string;
          photo: string | null;
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          email: string;
          name: string;
          photo?: string | null;
          role?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string;
          name?: string;
          photo?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          attributes: NonNullable<Json>;
          audience: string | null;
          created_at: string;
          email: string | null;
          external_id: string | null;
          id: string;
          kind: string;
          name: string | null;
          org_id: string | null;
          org_name: string | null;
          phone: string | null;
          verified: boolean;
        };
        ComputedFields: never;
        Insert: {
          attributes?: NonNullable<Json>;
          audience?: string | null;
          created_at?: string;
          email?: string | null;
          external_id?: string | null;
          id: string;
          kind?: string;
          name?: string | null;
          org_id?: string | null;
          org_name?: string | null;
          phone?: string | null;
          verified?: boolean;
        };
        Update: {
          attributes?: NonNullable<Json>;
          audience?: string | null;
          created_at?: string;
          email?: string | null;
          external_id?: string | null;
          id?: string;
          kind?: string;
          name?: string | null;
          org_id?: string | null;
          org_name?: string | null;
          phone?: string | null;
          verified?: boolean;
        };
        Relationships: [];
      };
      conversation_events: {
        Row: {
          actor_id: string | null;
          conversation_id: string;
          created_at: string;
          data: NonNullable<Json>;
          id: string;
          kind: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          conversation_id: string;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          kind: string;
        };
        Update: {
          actor_id?: string | null;
          conversation_id?: string;
          created_at?: string;
          data?: NonNullable<Json>;
          id?: string;
          kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_events_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_ratings: {
        Row: {
          comment: string | null;
          contact_id: string;
          conversation_id: string;
          created_at: string;
          score: number;
        };
        ComputedFields: never;
        Insert: {
          comment?: string | null;
          contact_id: string;
          conversation_id: string;
          created_at?: string;
          score: number;
        };
        Update: {
          comment?: string | null;
          contact_id?: string;
          conversation_id?: string;
          created_at?: string;
          score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_ratings_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contact_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_ratings_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversation_ratings_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: true;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          assignee_id: string | null;
          category: string | null;
          contact_id: string;
          context: NonNullable<Json>;
          created_at: string;
          id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          org_id: string | null;
          priority: string;
          source: string;
          status: string;
          subject: string | null;
          team_id: string | null;
          ticket_number: number | null;
          type: string;
          unread_for_agents: number;
          unread_for_contact: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          assignee_id?: string | null;
          category?: string | null;
          contact_id: string;
          context?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          org_id?: string | null;
          priority?: string;
          source: string;
          status?: string;
          subject?: string | null;
          team_id?: string | null;
          ticket_number?: number | null;
          type?: string;
          unread_for_agents?: number;
          unread_for_contact?: number;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string | null;
          category?: string | null;
          contact_id?: string;
          context?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          org_id?: string | null;
          priority?: string;
          source?: string;
          status?: string;
          subject?: string | null;
          team_id?: string | null;
          ticket_number?: number | null;
          type?: string;
          unread_for_agents?: number;
          unread_for_contact?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_assignee_id_fkey";
            columns: ["assignee_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "conversations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contact_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          attachments: NonNullable<Json>;
          body: string | null;
          channel: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string;
          sender_role: string;
        };
        ComputedFields: never;
        Insert: {
          attachments?: NonNullable<Json>;
          body?: string | null;
          channel?: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id: string;
          sender_role: string;
        };
        Update: {
          attachments?: NonNullable<Json>;
          body?: string | null;
          channel?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
          sender_role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          author_id: string;
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id: string;
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "notes_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      secrets: {
        Row: {
          key: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          is_public: boolean;
          key: string;
          updated_at: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          is_public?: boolean;
          key: string;
          updated_at?: string;
          value: NonNullable<Json>;
        };
        Update: {
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          agent_id: string;
          team_id: string;
        };
        ComputedFields: never;
        Insert: {
          agent_id: string;
          team_id: string;
        };
        Update: {
          agent_id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      contact_summaries: {
        Row: {
          conversation_count: number | null;
          created_at: string;
          email: string | null;
          id: string;
          kind: string;
          last_active_at: string | null;
          name: string | null;
          org_name: string | null;
          phone: string | null;
          verified: boolean;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      identify_contact: {
        Args: {
          attributes?: Json;
          audience?: string;
          contact_id: string;
          email?: string;
          external_id: string;
          name?: string;
          org_id?: string;
          org_name?: string;
        };
        Returns: {
          attributes: NonNullable<Json>;
          audience: string | null;
          created_at: string;
          email: string | null;
          external_id: string | null;
          id: string;
          kind: string;
          name: string | null;
          org_id: string | null;
          org_name: string | null;
          phone: string | null;
          verified: boolean;
        };
        SetofOptions: {
          from: "*";
          to: "contacts";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      search_conversations: {
        Args: { query: string };
        Returns: {
          assignee_id: string | null;
          category: string | null;
          contact_id: string;
          context: NonNullable<Json>;
          created_at: string;
          id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          org_id: string | null;
          priority: string;
          source: string;
          status: string;
          subject: string | null;
          team_id: string | null;
          ticket_number: number | null;
          type: string;
          unread_for_agents: number;
          unread_for_contact: number;
          updated_at: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "conversations";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      start_conversation: {
        Args: {
          body: string;
          contact_email?: string;
          contact_id: string;
          contact_name?: string;
          contact_phone?: string;
          context?: Json;
          source: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

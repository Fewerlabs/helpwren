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
      article_feedback: {
        Row: {
          article_id: string;
          created_at: string;
          helpful: boolean;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          article_id: string;
          created_at?: string;
          helpful: boolean;
          id?: string;
        };
        Update: {
          article_id?: string;
          created_at?: string;
          helpful?: boolean;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "article_feedback_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      articles: {
        Row: {
          author_id: string | null;
          author_name: string | null;
          author_photo: string | null;
          body: NonNullable<Json>;
          collection_id: string | null;
          created_at: string;
          featured: boolean;
          id: string;
          meta_description: string | null;
          meta_title: string | null;
          position: number;
          published_at: string | null;
          search: unknown;
          slug: string;
          status: string;
          summary: string | null;
          tags: string[];
          title: string;
          updated_at: string;
          visibility: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string | null;
          author_name?: string | null;
          author_photo?: string | null;
          body?: NonNullable<Json>;
          collection_id?: string | null;
          created_at?: string;
          featured?: boolean;
          id?: string;
          meta_description?: string | null;
          meta_title?: string | null;
          position?: number;
          published_at?: string | null;
          search?: never;
          slug: string;
          status?: string;
          summary?: string | null;
          tags?: string[];
          title: string;
          updated_at?: string;
          visibility?: string;
        };
        Update: {
          author_id?: string | null;
          author_name?: string | null;
          author_photo?: string | null;
          body?: NonNullable<Json>;
          collection_id?: string | null;
          created_at?: string;
          featured?: boolean;
          id?: string;
          meta_description?: string | null;
          meta_title?: string | null;
          position?: number;
          published_at?: string | null;
          search?: never;
          slug?: string;
          status?: string;
          summary?: string | null;
          tags?: string[];
          title?: string;
          updated_at?: string;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "articles_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      collections: {
        Row: {
          created_at: string;
          description: string | null;
          icon: string;
          id: string;
          name: string;
          position: number;
          slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          name: string;
          position?: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          icon?: string;
          id?: string;
          name?: string;
          position?: number;
          slug?: string;
          updated_at?: string;
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
      devices: {
        Row: {
          app: string;
          contact_id: string | null;
          created_at: string;
          external_id: string | null;
          id: string;
          platform: string;
          provider: string;
          push_token: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          app: string;
          contact_id?: string | null;
          created_at?: string;
          external_id?: string | null;
          id?: string;
          platform: string;
          provider?: string;
          push_token: string;
          updated_at?: string;
        };
        Update: {
          app?: string;
          contact_id?: string | null;
          created_at?: string;
          external_id?: string | null;
          id?: string;
          platform?: string;
          provider?: string;
          push_token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devices_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contact_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "devices_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      email_queue: {
        Row: {
          attempts: number;
          claimed_at: string | null;
          conversation_id: string;
          created_at: string;
          done_at: string | null;
          event_id: string | null;
          id: string;
          kind: string;
          message_id: string | null;
          outcome: string | null;
          send_after: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          claimed_at?: string | null;
          conversation_id: string;
          created_at?: string;
          done_at?: string | null;
          event_id?: string | null;
          id?: string;
          kind: string;
          message_id?: string | null;
          outcome?: string | null;
          send_after?: string;
        };
        Update: {
          attempts?: number;
          claimed_at?: string | null;
          conversation_id?: string;
          created_at?: string;
          done_at?: string | null;
          event_id?: string | null;
          id?: string;
          kind?: string;
          message_id?: string | null;
          outcome?: string | null;
          send_after?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_queue_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_queue_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "conversation_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_queue_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
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
      push_queue: {
        Row: {
          attempts: number;
          claimed_at: string | null;
          conversation_id: string;
          created_at: string;
          done_at: string | null;
          id: string;
          message_id: string;
          outcome: string | null;
          send_after: string;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          claimed_at?: string | null;
          conversation_id: string;
          created_at?: string;
          done_at?: string | null;
          id?: string;
          message_id: string;
          outcome?: string | null;
          send_after?: string;
        };
        Update: {
          attempts?: number;
          claimed_at?: string | null;
          conversation_id?: string;
          created_at?: string;
          done_at?: string | null;
          id?: string;
          message_id?: string;
          outcome?: string | null;
          send_after?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_queue_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "push_queue_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tickets: {
        Row: {
          created_at: string;
          device_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          device_id: string;
          id: string;
        };
        Update: {
          created_at?: string;
          device_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tickets_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "devices";
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
      article_feedback_totals: {
        Row: {
          article_id: string;
          helpful: number | null;
          unhelpful: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "article_feedback_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
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
      claim_email_queue: {
        Args: { batch?: number };
        Returns: {
          attempts: number;
          claimed_at: string | null;
          conversation_id: string;
          created_at: string;
          done_at: string | null;
          event_id: string | null;
          id: string;
          kind: string;
          message_id: string | null;
          outcome: string | null;
          send_after: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "email_queue";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      claim_push_queue: {
        Args: { batch?: number };
        Returns: {
          attempts: number;
          claimed_at: string | null;
          conversation_id: string;
          created_at: string;
          done_at: string | null;
          id: string;
          message_id: string;
          outcome: string | null;
          send_after: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "push_queue";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
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
      merge_guest_into_user: { Args: { guest_id: string; user_id: string }; Returns: number };
      reorder_articles: { Args: { ids: string[] }; Returns: undefined };
      reorder_collections: { Args: { ids: string[] }; Returns: undefined };
      search_articles: {
        Args: { query: string };
        Returns: {
          author_id: string | null;
          body: NonNullable<Json>;
          collection_id: string | null;
          created_at: string;
          featured: boolean;
          id: string;
          meta_description: string | null;
          meta_title: string | null;
          position: number;
          published_at: string | null;
          search: unknown;
          slug: string;
          status: string;
          summary: string | null;
          tags: string[];
          title: string;
          updated_at: string;
          visibility: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "articles";
          isOneToOne: false;
          isSetofReturn: true;
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
          ticket_subject?: string;
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

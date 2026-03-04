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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_calendar: {
        Row: {
          created_at: string
          description: string | null
          event_date: string | null
          event_name: string
          id: string
          week: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name: string
          id?: string
          week: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name?: string
          id?: string
          week?: number
        }
        Relationships: []
      }
      circles: {
        Row: {
          created_at: string
          id: string
          name: string
          sponsor: string | null
          teacher_id: string | null
          teacher_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sponsor?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sponsor?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
        }
        Relationships: []
      }
      daily_evaluations: {
        Row: {
          attendance: Database["public"]["Enums"]["attendance_status"]
          circle_id: string
          created_at: string
          day: string
          id: string
          maarij_points: number
          memorization: number
          revision: number
          student_id: string
          uniform_file_score: number
          updated_at: string
          week: number
        }
        Insert: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          circle_id: string
          created_at?: string
          day: string
          id?: string
          maarij_points?: number
          memorization?: number
          revision?: number
          student_id: string
          uniform_file_score?: number
          updated_at?: string
          week: number
        }
        Update: {
          attendance?: Database["public"]["Enums"]["attendance_status"]
          circle_id?: string
          created_at?: string
          day?: string
          id?: string
          maarij_points?: number
          memorization?: number
          revision?: number
          student_id?: string
          uniform_file_score?: number
          updated_at?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_evaluations_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_evaluations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      distinguished_circle_scores: {
        Row: {
          bee_buzz: number
          circle_id: string
          course: number
          created_at: string
          diamond_necklace: number
          id: string
          morals: number
          updated_at: string
        }
        Insert: {
          bee_buzz?: number
          circle_id: string
          course: number
          created_at?: string
          diamond_necklace?: number
          id?: string
          morals?: number
          updated_at?: string
        }
        Update: {
          bee_buzz?: number
          circle_id?: string
          course?: number
          created_at?: string
          diamond_necklace?: number
          id?: string
          morals?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distinguished_circle_scores_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      maarij_data: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          date: string
          exam_percentage: number
          id: string
          level_status: Database["public"]["Enums"]["level_status"]
          points: number
          reward_paid: boolean
          rewards: number
          started_at: string | null
          student_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          exam_percentage?: number
          id?: string
          level_status?: Database["public"]["Enums"]["level_status"]
          points?: number
          reward_paid?: boolean
          rewards?: number
          started_at?: string | null
          student_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          date?: string
          exam_percentage?: number
          id?: string
          level_status?: Database["public"]["Enums"]["level_status"]
          points?: number
          reward_paid?: boolean
          rewards?: number
          started_at?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maarij_data_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age: number | null
          circle_id: string | null
          created_at: string
          id: string
          level: number
          name: string
          parent_phone: string | null
          track: Database["public"]["Enums"]["student_track"]
        }
        Insert: {
          age?: number | null
          circle_id?: string | null
          created_at?: string
          id?: string
          level?: number
          name: string
          parent_phone?: string | null
          track?: Database["public"]["Enums"]["student_track"]
        }
        Update: {
          age?: number | null
          circle_id?: string | null
          created_at?: string
          id?: string
          level?: number
          name?: string
          parent_phone?: string | null
          track?: Database["public"]["Enums"]["student_track"]
        }
        Relationships: [
          {
            foreignKeyName: "students_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher"
      attendance_status: "حاضر" | "غائب" | "غائب بعذر" | "متأخر"
      level_status: "متقدم" | "متأخر" | "منضبط"
      student_track: "تمهيدي" | "فضي" | "ذهبي"
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
      app_role: ["admin", "teacher"],
      attendance_status: ["حاضر", "غائب", "غائب بعذر", "متأخر"],
      level_status: ["متقدم", "متأخر", "منضبط"],
      student_track: ["تمهيدي", "فضي", "ذهبي"],
    },
  },
} as const

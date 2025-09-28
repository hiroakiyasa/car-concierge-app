export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      parking_spots: {
        Row: {
          id: number
          name: string
          lat: number
          lng: number
          address: string | null
          area_name: string | null
          capacity: number | null
          created_at: string | null
          elevation: number | null
          height_limit: string | null
          hours: Json | null
          length_limit: string | null
          nearest_convenience_store: string | null
          nearest_hotspring: string | null
          nearest_toilet: Json | null
          operating_hours: string | null
          original_fees: string | null
          phone_number: string | null
          prefecture: string | null
          rates: Json | null
          special_notes: string | null
          spot_type: string | null
          total_spots: number | null
          type: string | null
          updated_at: string | null
          width_limit: string | null
        }
        Insert: {
          address?: string | null
          area_name?: string | null
          capacity?: number | null
          created_at?: string | null
          elevation?: number | null
          height_limit?: string | null
          hours?: Json | null
          id?: number
          lat: number
          length_limit?: string | null
          lng: number
          name: string
          nearest_convenience_store?: string | null
          nearest_hotspring?: string | null
          nearest_toilet?: Json | null
          operating_hours?: string | null
          original_fees?: string | null
          phone_number?: string | null
          prefecture?: string | null
          rates?: Json | null
          special_notes?: string | null
          spot_type?: string | null
          total_spots?: number | null
          type?: string | null
          updated_at?: string | null
          width_limit?: string | null
        }
        Update: {
          address?: string | null
          area_name?: string | null
          capacity?: number | null
          created_at?: string | null
          elevation?: number | null
          height_limit?: string | null
          hours?: Json | null
          id?: number
          lat?: number
          length_limit?: string | null
          lng?: number
          name?: string
          nearest_convenience_store?: string | null
          nearest_hotspring?: string | null
          nearest_toilet?: Json | null
          operating_hours?: string | null
          original_fees?: string | null
          phone_number?: string | null
          prefecture?: string | null
          rates?: Json | null
          special_notes?: string | null
          spot_type?: string | null
          total_spots?: number | null
          type?: string | null
          updated_at?: string | null
          width_limit?: string | null
        }
        Relationships: []
      }
      convenience_stores: {
        Row: {
          id: string
          name: string
          lat: number
          lng: number
          address: string | null
          area_name: string | null
          category: string | null
          created_at: string | null
          operating_hours: string | null
          phone_number: string | null
          prefecture: string | null
          sub_type: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          area_name?: string | null
          category?: string | null
          created_at?: string | null
          id: string
          lat: number
          lng: number
          name: string
          operating_hours?: string | null
          phone_number?: string | null
          prefecture?: string | null
          sub_type?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          area_name?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          operating_hours?: string | null
          phone_number?: string | null
          prefecture?: string | null
          sub_type?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hot_springs: {
        Row: {
          id: string
          name: string
          lat: number
          lng: number
          address: string | null
          created_at: string | null
          facility_type: string | null
          holiday_info: string | null
          operating_hours: string | null
          price: string | null
          price_info: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          facility_type?: string | null
          holiday_info?: string | null
          id: string
          lat: number
          lng: number
          name: string
          operating_hours?: string | null
          price?: string | null
          price_info?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          facility_type?: string | null
          holiday_info?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          operating_hours?: string | null
          price?: string | null
          price_info?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      toilets: {
        Row: {
          id: number
          name: string
          lat: number
          lng: number
          address: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id: number
          lat: number
          lng: number
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: number
          lat?: number
          lng?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_parking_spots_sorted_by_fee: {
        Args: {
          duration_minutes: number
          max_lat: number
          max_lng: number
          min_elevation?: number
          min_lat: number
          min_lng: number
          parking_start?: string
        }
        Returns: {
          calculated_fee: number
          capacity: string
          elevation: number
          hours: Json
          id: number
          latitude: number
          longitude: number
          name: string
          nearest_convenience_store: Json
          nearest_hotspring: Json
          nearest_toilet: Json
          rank: number
          rates: Json
          total_spots_in_region: number
          type: string
        }[]
      }
      calculate_simple_parking_fee: {
        Args:
          | { duration_minutes: number; parking_start: string; rates: Json }
          | { duration_minutes: number; parking_start?: string; rates: Json }
        Returns: number
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
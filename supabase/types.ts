/**
 * AssistSocial - Database Types & Frontend Data Contracts
 * Auto-generated contract definitions for Supabase & TypeScript
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'social_worker' | 'supervisor' | 'global_admin'

export type ActivityStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'not_completed'
  | 'rescheduled'
  | 'cancelled'

export type ActivityCategory =
  | 'atendimento'
  | 'reuniao'
  | 'visita_domiciliar'
  | 'elaboracao_relatorio'
  | 'outros'

export type SharePermission = 'viewer' | 'commenter' | 'editor'

export type ShareStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export type ResourceType = 'activity' | 'document' | 'folder'

export type AiAnalysisStatus =
  | 'not_requested'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          avatar_url: string | null
          role: UserRole | string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: UserRole | string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: UserRole | string
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          starts_at: string
          ends_at: string | null
          category: ActivityCategory | string
          status: ActivityStatus
          failure_reason: string | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          starts_at: string
          ends_at?: string | null
          category?: ActivityCategory | string
          status?: ActivityStatus
          failure_reason?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          starts_at?: string
          ends_at?: string | null
          category?: ActivityCategory | string
          status?: ActivityStatus
          failure_reason?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          owner_id: string
          name: string
          parent_folder_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          parent_folder_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          parent_folder_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          owner_id: string
          folder_id: string | null
          original_name: string
          display_name: string
          storage_path: string
          mime_type: string
          file_size: number
          ai_analysis_status: AiAnalysisStatus
          ai_summary: string | null
          ai_metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          folder_id?: string | null
          original_name: string
          display_name: string
          storage_path: string
          mime_type: string
          file_size?: number
          ai_analysis_status?: AiAnalysisStatus
          ai_summary?: string | null
          ai_metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          folder_id?: string | null
          original_name?: string
          display_name?: string
          storage_path?: string
          mime_type?: string
          file_size?: number
          ai_analysis_status?: AiAnalysisStatus
          ai_summary?: string | null
          ai_metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      resource_shares: {
        Row: {
          id: string
          owner_id: string
          resource_type: ResourceType
          resource_id: string
          invited_user_id: string | null
          invited_email: string | null
          permission: SharePermission
          status: ShareStatus
          expires_at: string | null
          revoked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          resource_type: ResourceType
          resource_id: string
          invited_user_id?: string | null
          invited_email?: string | null
          permission: SharePermission
          status?: ShareStatus
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          resource_type?: ResourceType
          resource_id?: string
          invited_user_id?: string | null
          invited_email?: string | null
          permission?: SharePermission
          status?: ShareStatus
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          author_id: string
          resource_type: 'activity' | 'document'
          resource_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          resource_type: 'activity' | 'document'
          resource_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          resource_type?: 'activity' | 'document'
          resource_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          resource_type: string
          resource_id: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          resource_type: string
          resource_id: string
          details?: Json
          created_at?: string
        }
        Update: never // Audit logs are immutable
      }
    }
  }
}

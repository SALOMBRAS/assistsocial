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
          role: string
          must_change_password: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: string
          must_change_password?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: string
          must_change_password?: boolean
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
      activity_attachments: {
        Row: {
          id: string
          activity_id: string
          uploader_id: string
          storage_path: string
          original_name: string
          mime_type: string
          file_size: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          uploader_id: string
          storage_path: string
          original_name: string
          mime_type: string
          file_size?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          uploader_id?: string
          storage_path?: string
          original_name?: string
          mime_type?: string
          file_size?: number
          created_at?: string
          updated_at?: string
        }
      }
      residential_batches: {
        Row: {
          id: string
          residencial_slug: 'paupina' | 'joaquim_machado' | string
          name: string
          dispatch_date: string | null
          status: 'draft' | 'enviado' | 'em_processamento' | 'concluido' | 'arquivado' | string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          residencial_slug: 'paupina' | 'joaquim_machado' | string
          name: string
          dispatch_date?: string | null
          status?: 'draft' | 'enviado' | 'em_processamento' | 'concluido' | 'arquivado' | string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          residencial_slug?: 'paupina' | 'joaquim_machado' | string
          name?: string
          dispatch_date?: string | null
          status?: 'draft' | 'enviado' | 'em_processamento' | 'concluido' | 'arquivado' | string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dossiers: {
        Row: {
          id: string
          residencial_slug: 'paupina' | 'joaquim_machado' | string
          code: string | null
          person_name: string
          unit_number: string | null
          phone: string | null
          operational_status: 'sem_pendencia' | 'com_pendencias' | 'reenviado_pesquisa' | 'nao_veio' | 'excluido' | string
          compliance_status: 'conforme' | 'inconforme' | 'neutro' | string
          batch_id: string | null
          needs_proxy: boolean
          proxy_status: 'nao_se_aplica' | 'pendente' | 'em_andamento' | 'concluida' | string
          proxy_reason: string | null
          proxy_notes: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          residencial_slug: 'paupina' | 'joaquim_machado' | string
          code?: string | null
          person_name: string
          unit_number?: string | null
          phone?: string | null
          operational_status?: 'sem_pendencia' | 'com_pendencias' | 'reenviado_pesquisa' | 'nao_veio' | 'excluido' | string
          compliance_status?: 'conforme' | 'inconforme' | 'neutro' | string
          batch_id?: string | null
          needs_proxy?: boolean
          proxy_status?: 'nao_se_aplica' | 'pendente' | 'em_andamento' | 'concluida' | string
          proxy_reason?: string | null
          proxy_notes?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          residencial_slug?: 'paupina' | 'joaquim_machado' | string
          code?: string | null
          person_name?: string
          unit_number?: string | null
          phone?: string | null
          operational_status?: 'sem_pendencia' | 'com_pendencias' | 'reenviado_pesquisa' | 'nao_veio' | 'excluido' | string
          compliance_status?: 'conforme' | 'inconforme' | 'neutro' | string
          batch_id?: string | null
          needs_proxy?: boolean
          proxy_status?: 'nao_se_aplica' | 'pendente' | 'em_andamento' | 'concluida' | string
          proxy_reason?: string | null
          proxy_notes?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    },
    Functions: {
      mark_first_password_changed: {
        Args: Record<string, never>
        Returns: {
          success: boolean
          message: string
        }
      }
      complete_first_password_change: {
        Args: {
          p_new_password: string
        }
        Returns: {
          success: boolean
          message: string
        }
      }
    }
  }
}

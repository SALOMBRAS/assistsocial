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
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'share_invite' | 'share_response' | 'reminder' | 'system' | 'activity'
          title: string
          content: string
          resource_type: string | null
          resource_id: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'share_invite' | 'share_response' | 'reminder' | 'system' | 'activity'
          title: string
          content: string
          resource_type?: string | null
          resource_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'share_invite' | 'share_response' | 'reminder' | 'system' | 'activity'
          title?: string
          content?: string
          resource_type?: string | null
          resource_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          remind_at: string
          is_completed: boolean
          activity_id: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          remind_at: string
          is_completed?: boolean
          activity_id?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          remind_at?: string
          is_completed?: boolean
          activity_id?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      residenciais: {
        Row: {
          id: string
          slug: string
          name: string
          address: string
          blocks_count: number
          floors_count: number
          pcd_adapted_units_count: number
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          address: string
          blocks_count?: number
          floors_count?: number
          pcd_adapted_units_count?: number
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          address?: string
          blocks_count?: number
          floors_count?: number
          pcd_adapted_units_count?: number
          description?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
,
      residential_simple_metrics: {
        Row: {
          id: string
          residencial_id: string
          residencial_slug: string
          total_capacity: number | null
          occupied_units: number | null
          available_units: number | null
          pcd_adapted_units: number | null
          pending_documents_count: number | null
          regular_documents_count: number | null
          dossiers_no_pending_count: number | null
          dossiers_with_pending_count: number | null
          dossiers_resubmitted_search_count: number | null
          no_show_count: number | null
          dossiers_excluded_count: number | null
          dossiers_compliant_count: number | null
          dossiers_non_compliant_count: number | null
          dossiers_batched_count: number | null
          proxies_needed_count: number | null
          notes: string | null
          custom_metrics: Record<string, unknown>
          last_updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          residencial_id: string
          residencial_slug: string
          total_capacity?: number | null
          occupied_units?: number | null
          available_units?: number | null
          pcd_adapted_units?: number | null
          pending_documents_count?: number | null
          regular_documents_count?: number | null
          dossiers_no_pending_count?: number | null
          dossiers_with_pending_count?: number | null
          dossiers_resubmitted_search_count?: number | null
          no_show_count?: number | null
          dossiers_excluded_count?: number | null
          dossiers_compliant_count?: number | null
          dossiers_non_compliant_count?: number | null
          dossiers_batched_count?: number | null
          proxies_needed_count?: number | null
          notes?: string | null
          custom_metrics?: Record<string, unknown>
          last_updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          residencial_id?: string
          residencial_slug?: string
          total_capacity?: number | null
          occupied_units?: number | null
          available_units?: number | null
          pcd_adapted_units?: number | null
          pending_documents_count?: number | null
          regular_documents_count?: number | null
          dossiers_no_pending_count?: number | null
          dossiers_with_pending_count?: number | null
          dossiers_resubmitted_search_count?: number | null
          no_show_count?: number | null
          dossiers_excluded_count?: number | null
          dossiers_compliant_count?: number | null
          dossiers_non_compliant_count?: number | null
          dossiers_batched_count?: number | null
          proxies_needed_count?: number | null
          notes?: string | null
          custom_metrics?: Record<string, unknown>
          last_updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      },
      residential_metrics_history: {
        Row: {
          id: string
          residencial_id: string
          residencial_slug: string
          metrics_snapshot: Record<string, unknown>
          updated_by: string | null
          reason: string | null
          recorded_at: string
        }
        Insert: {
          id?: string
          residencial_id: string
          residencial_slug: string
          metrics_snapshot: Record<string, unknown>
          updated_by?: string | null
          reason?: string | null
          recorded_at?: string
        }
        Update: {
          id?: string
          residencial_id?: string
          residencial_slug?: string
          metrics_snapshot?: Record<string, unknown>
          updated_by?: string | null
          reason?: string | null
          recorded_at?: string
        }
      },
      social_services: {
        Row: {
          id: string
          name: string
          organization: string
          category: string
          state: string
          municipality: string
          neighborhood: string | null
          address: string
          postal_code: string | null
          contact_phone: string | null
          contact_email: string | null
          regular_schedule: string | null
          target_public: string[]
          access_requirements: string[]
          accessibility_features: string[]
          is_free: boolean
          official_link: string | null
          info_source: string
          verification_status: 'verified' | 'in_review' | 'pending_confirmation'
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          organization: string
          category: string
          state?: string
          municipality: string
          neighborhood?: string | null
          address: string
          postal_code?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          regular_schedule?: string | null
          target_public?: string[]
          access_requirements?: string[]
          accessibility_features?: string[]
          is_free?: boolean
          official_link?: string | null
          info_source: string
          verification_status?: 'verified' | 'in_review' | 'pending_confirmation'
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          organization?: string
          category?: string
          state?: string
          municipality?: string
          neighborhood?: string | null
          address?: string
          postal_code?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          regular_schedule?: string | null
          target_public?: string[]
          access_requirements?: string[]
          accessibility_features?: string[]
          is_free?: boolean
          official_link?: string | null
          info_source?: string
          verification_status?: 'verified' | 'in_review' | 'pending_confirmation'
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      },
      families: {
        Row: {
          id: string
          code: string | null
          family_name: string
          responsible_name: string
          neighborhood: string | null
          municipality: string
          address: string | null
          phone: string | null
          current_stage: string
          stage_updated_at: string
          stage_updated_by: string | null
          notes: string | null
          assigned_worker_id: string | null
          created_by: string | null
          last_movement_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code?: string | null
          family_name: string
          responsible_name: string
          neighborhood?: string | null
          municipality?: string
          address?: string | null
          phone?: string | null
          current_stage?: string
          stage_updated_at?: string
          stage_updated_by?: string | null
          notes?: string | null
          assigned_worker_id?: string | null
          created_by?: string | null
          last_movement_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string | null
          family_name?: string
          responsible_name?: string
          neighborhood?: string | null
          municipality?: string
          address?: string | null
          phone?: string | null
          current_stage?: string
          stage_updated_at?: string
          stage_updated_by?: string | null
          notes?: string | null
          assigned_worker_id?: string | null
          created_by?: string | null
          last_movement_at?: string
          created_at?: string
          updated_at?: string
        }
      },
      family_members: {
        Row: {
          id: string
          family_id: string
          full_name: string
          nis: string | null
          cpf: string | null
          relationship: string
          birth_date: string | null
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          full_name: string
          nis?: string | null
          cpf?: string | null
          relationship: string
          birth_date?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          full_name?: string
          nis?: string | null
          cpf?: string | null
          relationship?: string
          birth_date?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      },
      family_timeline_events: {
        Row: {
          id: string
          family_id: string
          person_id: string | null
          event_type: string
          title: string
          description: string | null
          event_date: string
          stage: string | null
          author_id: string | null
          author_name: string | null
          related_activity_id: string | null
          related_document_id: string | null
          related_dossier_id: string | null
          next_action: string | null
          next_action_due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          person_id?: string | null
          event_type: string
          title: string
          description?: string | null
          event_date?: string
          stage?: string | null
          author_id?: string | null
          author_name?: string | null
          related_activity_id?: string | null
          related_document_id?: string | null
          related_dossier_id?: string | null
          next_action?: string | null
          next_action_due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          person_id?: string | null
          event_type?: string
          title?: string
          description?: string | null
          event_date?: string
          stage?: string | null
          author_id?: string | null
          author_name?: string | null
          related_activity_id?: string | null
          related_document_id?: string | null
          related_dossier_id?: string | null
          next_action?: string | null
          next_action_due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      },
      family_pendencies: {
        Row: {
          id: string
          family_id: string
          person_id: string | null
          title: string
          description: string | null
          category: string
          assigned_to: string | null
          assigned_to_name: string | null
          due_date: string | null
          priority: 'baixa' | 'media' | 'alta' | 'urgente'
          status: 'pendente' | 'em_andamento' | 'aguardando_familia' | 'aguardando_instituicao' | 'resolvida' | 'cancelada'
          next_action: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolution_notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id: string
          person_id?: string | null
          title: string
          description?: string | null
          category?: string
          assigned_to?: string | null
          assigned_to_name?: string | null
          due_date?: string | null
          priority?: 'baixa' | 'media' | 'alta' | 'urgente'
          status?: 'pendente' | 'em_andamento' | 'aguardando_familia' | 'aguardando_instituicao' | 'resolvida' | 'cancelada'
          next_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          person_id?: string | null
          title?: string
          description?: string | null
          category?: string
          assigned_to?: string | null
          assigned_to_name?: string | null
          due_date?: string | null
          priority?: 'baixa' | 'media' | 'alta' | 'urgente'
          status?: 'pendente' | 'em_andamento' | 'aguardando_familia' | 'aguardando_instituicao' | 'resolvida' | 'cancelada'
          next_action?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolution_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      },
      family_stage_history: {
        Row: {
          id: string
          family_id: string
          previous_stage: string | null
          new_stage: string
          reason: string | null
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          family_id: string
          previous_stage?: string | null
          new_stage: string
          reason?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          family_id?: string
          previous_stage?: string | null
          new_stage?: string
          reason?: string | null
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
        }
      },
      document_processing_jobs: {
        Row: {
          id: string
          user_id: string
          operation_type: string
          status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'
          original_filename: string | null
          result_filename: string | null
          output_format: string | null
          file_size: number | null
          error_code: string | null
          error_message: string | null
          metadata: Json
          created_at: string
          completed_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          operation_type: string
          status?: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'
          original_filename?: string | null
          result_filename?: string | null
          output_format?: string | null
          file_size?: number | null
          error_code?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
          completed_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          operation_type?: string
          status?: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'
          original_filename?: string | null
          result_filename?: string | null
          output_format?: string | null
          file_size?: number | null
          error_code?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
          completed_at?: string | null
          expires_at?: string
        }
      },
    },
    Functions: {
      create_document_job: {
        Args: {
          p_operation_type: string
          p_original_filename?: string | null
          p_output_format?: string | null
          p_metadata?: Json
        }
        Returns: Json
      },
      update_document_job_status: {
        Args: {
          p_job_id: string
          p_status: string
          p_result_filename?: string | null
          p_file_size?: number | null
          p_error_code?: string | null
          p_error_message?: string | null
          p_metadata?: Json
        }
        Returns: Json
      },
      get_user_document_jobs: {
        Args: {
          p_limit?: number
        }
        Returns: {
          id: string
          operation_type: string
          status: string
          original_filename: string | null
          result_filename: string | null
          output_format: string | null
          file_size: number | null
          error_code: string | null
          created_at: string
          completed_at: string | null
          expires_at: string
        }[]
      },
      cancel_document_job: {
        Args: {
          p_job_id: string
        }
        Returns: Json
      },
      cleanup_expired_document_jobs: {
        Args: Record<string, never>
        Returns: number
      },

      get_residential_simple_metrics: {
        Args: {
          p_residencial_slug: string
        }
        Returns: Record<string, unknown>
      },
      upsert_residential_simple_metrics: {
        Args: {
          p_residencial_slug: string
          p_metrics: Record<string, unknown>
        }
        Returns: Record<string, unknown>
      },
      get_residential_metrics_history: {
        Args: {
          p_residencial_slug: string
          p_limit?: number
        }
        Returns: Record<string, unknown>[]
      },
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
      mark_notification_read: {
        Args: {
          p_notification_id: string
        }
        Returns: {
          success: boolean
          id: string
        }
      }
      mark_all_notifications_read: {
        Args: Record<string, never>
        Returns: {
          success: boolean
          updated_count: number
        }
      }
      get_unread_notifications_count: {
        Args: Record<string, never>
        Returns: number
      }
      create_activity_share_invite: {
        Args: {
          p_activity_id: string
          p_recipient_user_id: string
          p_permission?: string
        }
        Returns: {
          success: boolean
          share_id: string
          status: string
          message: string
        }
      }
      respond_to_share_invite: {
        Args: {
          p_share_id: string
          p_action: string
        }
        Returns: {
          success: boolean
          share_id: string
          status: string
          message: string
        }
      }
      search_users_for_sharing: {
        Args: {
          p_query: string
          p_limit?: number
        }
        Returns: {
          id: string
          full_name: string | null
          email: string
          role: string | null
          avatar_url: string | null
        }[]
      }
      create_document_share_invite: {
        Args: {
          p_document_id: string
          p_recipient_user_id: string
          p_permission?: string
        }
        Returns: {
          success: boolean
          share_id: string
          status: string
          message: string
        }
      }
      toggle_reminder_completed: {
        Args: {
          p_reminder_id: string
        }
        Returns: {
          success: boolean
          id: string
          is_completed: boolean
        }
      }
    }
  }
}

export type NotificationItem = Database['public']['Tables']['notifications']['Row']
export type ReminderItem = Database['public']['Tables']['reminders']['Row']
export type ResidencialItem = Database['public']['Tables']['residenciais']['Row']


export type ResidentialSimpleMetricsRow = Database['public']['Tables']['residential_simple_metrics']['Row']
export type ResidentialSimpleMetricsInsert = Database['public']['Tables']['residential_simple_metrics']['Insert']
export type ResidentialSimpleMetricsUpdate = Database['public']['Tables']['residential_simple_metrics']['Update']
export type ResidentialMetricsHistoryRow = Database['public']['Tables']['residential_metrics_history']['Row']

export type FamilyStage =
  | 'cadastro_inicial'
  | 'triagem'
  | 'aguardando_documentos'
  | 'avaliacao_social'
  | 'plano_acompanhamento'
  | 'encaminhamentos'
  | 'aguardando_retorno'
  | 'acompanhamento_ativo'
  | 'revisao'
  | 'concluido'
  | 'suspenso'

export type PendencyPriority = 'baixa' | 'media' | 'alta' | 'urgente'
export type PendencyStatus =
  | 'pendente'
  | 'em_andamento'
  | 'aguardando_familia'
  | 'aguardando_instituicao'
  | 'resolvida'
  | 'cancelada'

export type SocialServiceRow = Database['public']['Tables']['social_services']['Row']
export type FamilyRow = Database['public']['Tables']['families']['Row']
export type FamilyMemberRow = Database['public']['Tables']['family_members']['Row']
export type FamilyTimelineEventRow = Database['public']['Tables']['family_timeline_events']['Row']
export type FamilyPendencyRow = Database['public']['Tables']['family_pendencies']['Row']
export type FamilyStageHistoryRow = Database['public']['Tables']['family_stage_history']['Row']
export type DocumentProcessingJobRow = Database['public']['Tables']['document_processing_jobs']['Row']

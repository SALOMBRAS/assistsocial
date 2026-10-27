import React, { useState, useEffect } from 'react'
import {
  FileCheck,
  CheckCircle2,
  X,
  ShieldCheck,
  UserCheck,
  CheckSquare,
  Square,
} from 'lucide-react'
import type { DocumentItem } from './DocumentsView'
import { useModalA11y } from '../hooks/useModalA11y'

interface DocumentReviewAssistantProps {
  isOpen: boolean
  onClose: () => void
  document: DocumentItem | null
  onSaveReview: (docId: string, isCompleted: boolean, summaryNotes: string) => Promise<void>
  reviewerName?: string
}

interface ChecklistItem {
  id: string
  label: string
  description: string
  checked: boolean
  requiresHumanConfirmation: boolean
}

export const DocumentReviewAssistant: React.FC<DocumentReviewAssistantProps> = ({
  isOpen,
  onClose,
  document,
  onSaveReview,
  reviewerName = 'Assistente Social',
}) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'identification',
      label: '1. Identificação Completa do Usuário e Família',
      description: 'Nome civil/social, CPF ou NIS, filiação e composição familiar verificados.',
      checked: false,
      requiresHumanConfirmation: true,
    },
    {
      id: 'circumstances',
      label: '2. Relato Circunstanciado da Situação Social',
      description: 'Descrição objetiva da demanda, histórico de vulnerabilidades e contexto socioeconômico.',
      checked: false,
      requiresHumanConfirmation: false,
    },
    {
      id: 'technical_opinion',
      label: '3. Parecer Técnico Socioassistencial Fundamentado',
      description: 'Análise técnica balizada pelas diretrizes do SUAS, sem julgamentos morais e com fundamentação.',
      checked: false,
      requiresHumanConfirmation: true,
    },
    {
      id: 'attachments',
      label: '4. Documentos Comprobatórios Anexados',
      description: 'Comprovante de residência, documentos civis e certidões anexadas de forma legível.',
      checked: false,
      requiresHumanConfirmation: false,
    },
    {
      id: 'signature',
      label: '5. Identificação e Registro CRESS Válido',
      description: 'Assinatura digital/física com carimbo do Conselho Regional de Serviço Social da responsável.',
      checked: false,
      requiresHumanConfirmation: true,
    },
  ])

  const [summaryNotes, setSummaryNotes] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [humanConfirmationAgreed, setHumanConfirmationAgreed] = useState<boolean>(false)

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  useEffect(() => {
    if (document) {
      const isAlreadyReviewed = document.ai_analysis_status === 'completed' || document.ai_analysis_status === 'reviewed'
      setSummaryNotes(
        isAlreadyReviewed
          ? `Documento verificado e aprovado em conformidade com as diretrizes técnicas do SUAS.`
          : `Análise técnica de conformidade do documento "${document.display_name}". Todos os requisitos devem ser conferidos pelo assistente social.`
      )
      setChecklist((prev) =>
        prev.map((item) => ({
          ...item,
          checked: isAlreadyReviewed,
        }))
      )
      setHumanConfirmationAgreed(isAlreadyReviewed)
    }
  }, [document])

  if (!isOpen || !document) return null

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    )
  }

  const allItemsChecked = checklist.every((item) => item.checked)
  const canFinalize = allItemsChecked && humanConfirmationAgreed

  const handleSave = async (complete: boolean) => {
    setIsSaving(true)
    try {
      await onSaveReview(document.id, complete, summaryNotes)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-[#F6E4EC] shadow-2xl space-y-5 animate-scale-up max-h-[90dvh] overflow-y-auto">
        {/* CABEÇALHO DO MODAL */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F6E4EC]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
              <FileCheck size={22} />
            </span>
            <div>
              <h3 id="review-modal-title" className="text-base md:text-lg font-black text-[#28232A]">
                Revisão Assistida de Conformidade Documental
              </h3>
              <p className="text-xs text-[#827780]">
                Auditoria de requisitos do SUAS e parâmetros éticos CFESS/CRESS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* METADADOS DO DOCUMENTO */}
        <div className="p-4 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase text-[#827780]">Documento Selecionado</span>
            <h4 className="font-bold text-[#28232A] text-sm">{document.display_name}</h4>
            <p className="text-[11px] text-[#827780]">
              Arquivo original: {document.original_name} • {(document.file_size / 1024).toFixed(1)} KB
            </p>
          </div>

          <span
            className={`text-[10px] font-bold px-3 py-1 rounded-full self-start sm:self-center ${
              document.ai_analysis_status === 'completed' || document.ai_analysis_status === 'reviewed'
                ? 'bg-[#EBF7F1] text-[#36A879] border border-[#A7E2C6]'
                : 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]'
            }`}
          >
            {document.ai_analysis_status === 'completed' || document.ai_analysis_status === 'reviewed'
              ? 'Revisão Concluída'
              : 'Pendente de Conferência'}
          </span>
        </div>

        {/* ALERTA DE ÉTICA E PROTEÇÃO DE DADOS (SEM IA EXTERNA NÃO AUTORIZADA) */}
        <div className="p-3.5 rounded-2xl bg-[#EBF7F1]/80 border border-[#36A879]/30 flex items-start gap-2.5 text-xs text-[#28232A]">
          <ShieldCheck size={18} className="text-[#36A879] shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold text-[#36A879]">Garantia de Sigilo Profissional: </span>
            A conferência é executada de forma estritamente local e assistida. Não há envio de relatórios e dados sigilosos para provedores externos de IA não auditados, em conformidade com o Código de Ética e LGPD.
          </div>
        </div>

        {/* CHECKLIST DE REQUISITOS TÉCNICOS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#28232A] uppercase tracking-wide">
              Checklist de Requisitos Obrigatórios
            </span>
            <span className="text-[11px] font-semibold text-[#827780]">
              {checklist.filter((i) => i.checked).length} de {checklist.length} verificados
            </span>
          </div>

          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  item.checked
                    ? 'bg-[#FFF9FB] border-[#36A879]/40'
                    : 'bg-white border-[#F6E4EC] hover:border-[#F58BB5]'
                }`}
              >
                <div className="mt-0.5 text-[#F04491]">
                  {item.checked ? (
                    <CheckSquare size={18} className="text-[#36A879]" />
                  ) : (
                    <Square size={18} className="text-[#827780]" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${item.checked ? 'text-[#28232A]' : 'text-[#827780]'}`}>
                      {item.label}
                    </span>
                    {item.requiresHumanConfirmation && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-[#FEF8EC] text-[#E59B28] rounded border border-[#FED7AA]">
                        Confirmação Humana
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#827780] mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RESUMO TÉCNICO EDITÁVEL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#28232A] uppercase tracking-wide">
            Parecer de Conferência / Resumo de Validação
          </label>
          <textarea
            rows={3}
            value={summaryNotes}
            onChange={(e) => setSummaryNotes(e.target.value)}
            placeholder="Insira as observações técnicas sobre a revisão documental..."
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs text-[#28232A] focus:outline-none focus:border-[#F04491] leading-relaxed resize-none font-medium"
          />
        </div>

        {/* DECLARAÇÃO DE RESPONSABILIDADE HUMANA */}
        <div
          onClick={() => setHumanConfirmationAgreed(!humanConfirmationAgreed)}
          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
            humanConfirmationAgreed ? 'bg-[#EBF7F1] border-[#36A879]' : 'bg-[#FFF9FB] border-[#F6E4EC]'
          }`}
        >
          <UserCheck size={18} className={humanConfirmationAgreed ? 'text-[#36A879]' : 'text-[#827780]'} />
          <div className="flex-1 text-xs">
            <span className="font-bold text-[#28232A] block">
              Confirmação de Responsabilidade Profissional
            </span>
            <span className="text-[11px] text-[#827780]">
              Declaro que realizei a conferência técnica dos itens acima na qualidade de {reviewerName}.
            </span>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="pt-3 border-t border-[#F6E4EC] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#827780] hover:text-[#28232A] cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(false)}
              className="px-4 py-2 rounded-2xl bg-white border border-[#F6E4EC] text-xs font-bold text-[#28232A] hover:border-[#F04491] transition-all cursor-pointer"
            >
              Salvar como Rascunho
            </button>

            <button
              type="button"
              disabled={!canFinalize || isSaving}
              onClick={() => handleSave(true)}
              className={`px-5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                canFinalize && !isSaving
                  ? 'bg-[#36A879] hover:bg-[#2F9369] text-white shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={15} />
              <span>{isSaving ? 'Gravando...' : 'Concluir Revisão'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

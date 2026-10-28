import React, { useState, useEffect } from 'react'
import { X, Building2, MapPin, Layers, Building, Accessibility, Loader2, CheckCircle2 } from 'lucide-react'
import { useModalA11y } from '../hooks/useModalA11y'
import { useAuth } from '../contexts/AuthContext'
import {
  createResidencial,
  updateResidencial,
  type CreateResidencialInput,
} from '../services/residentialService'
import type { ResidencialItem } from '../types/supabase'

interface ResidencialModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveSuccess: (item: ResidencialItem) => void
  editingResidencial?: ResidencialItem | null
}

export const ResidencialModal: React.FC<ResidencialModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  editingResidencial,
}) => {
  const { user } = useAuth()
  const isEditing = Boolean(editingResidencial)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [blocksCount, setBlocksCount] = useState<number | string>(0)
  const [floorsCount, setFloorsCount] = useState<number | string>(0)
  const [pcdCount, setPcdCount] = useState<number | string>(0)
  const [description, setDescription] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useModalA11y({
    isOpen,
    onClose,
    closeOnEscape: true,
    preventScroll: true,
  })

  useEffect(() => {
    if (isOpen) {
      if (editingResidencial) {
        setName(editingResidencial.name || '')
        setAddress(editingResidencial.address || '')
        setBlocksCount(editingResidencial.blocks_count ?? 0)
        setFloorsCount(editingResidencial.floors_count ?? 0)
        setPcdCount(editingResidencial.pcd_adapted_units_count ?? 0)
        setDescription(editingResidencial.description || '')
      } else {
        setName('')
        setAddress('')
        setBlocksCount(0)
        setFloorsCount(0)
        setPcdCount(0)
        setDescription('')
      }
      setErrors([])
    }
  }, [isOpen, editingResidencial])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])

    const payload: CreateResidencialInput = {
      name: name.trim(),
      address: address.trim(),
      blocks_count: Number(blocksCount),
      floors_count: Number(floorsCount),
      pcd_adapted_units_count: Number(pcdCount),
      description: description.trim() || undefined,
    }

    setIsSubmitting(true)
    try {
      if (isEditing && editingResidencial) {
        const res = await updateResidencial(editingResidencial.slug, payload)
        if (res.error) {
          setErrors([res.error])
        } else if (res.data) {
          onSaveSuccess(res.data)
          onClose()
        }
      } else {
        const res = await createResidencial(payload, user?.id)
        if (res.error) {
          setErrors([res.error])
        } else if (res.data) {
          onSaveSuccess(res.data)
          onClose()
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="residencial-modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#F6E4EC] overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#F6E4EC] flex items-center justify-between bg-gradient-to-r from-[#FFF9FB] to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center shrink-0">
              <Building2 size={18} />
            </div>
            <div>
              <h2 id="residencial-modal-title" className="text-base font-black text-[#28232A]">
                {isEditing ? 'Editar Residencial' : 'Cadastrar Novo Residencial'}
              </h2>
              <p className="text-xs text-[#827780] font-medium">
                Especificações e características do conjunto habitacional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#F04491] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errors.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="font-bold">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {/* Campo 1: Nome do Residencial */}
          <div>
            <label className="block text-xs font-bold text-[#28232A] uppercase tracking-wider mb-1">
              Nome do Residencial *
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type="text"
                required
                placeholder="Ex: Residencial Parque dos Sonhos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:border-[#F04491]"
              />
            </div>
          </div>

          {/* Campo 2: Endereço */}
          <div>
            <label className="block text-xs font-bold text-[#28232A] uppercase tracking-wider mb-1">
              Endereço Completo *
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#827780]" />
              <input
                type="text"
                required
                placeholder="Ex: Av. Principal, 1200, Bairro Esperança, Fortaleza - CE"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:border-[#F04491]"
              />
            </div>
          </div>

          {/* Campos 3, 4, 5: Blocos, Andares e Apartamentos PCD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#28232A] uppercase tracking-wider mb-1">
                Quantidade de Blocos *
              </label>
              <div className="relative">
                <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={blocksCount}
                  onChange={(e) => setBlocksCount(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 text-xs sm:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:border-[#F04491]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#28232A] uppercase tracking-wider mb-1">
                Quantidade de Andares *
              </label>
              <div className="relative">
                <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={floorsCount}
                  onChange={(e) => setFloorsCount(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 text-xs sm:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:border-[#F04491]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#28232A] uppercase tracking-wider mb-1 truncate" title="Apartamentos PCD">
                Aptos. Adaptados PCD *
              </label>
              <div className="relative">
                <Accessibility size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#827780]" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={pcdCount}
                  onChange={(e) => setPcdCount(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 text-xs sm:text-sm bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:border-[#F04491]"
                />
              </div>
            </div>
          </div>

          {/* Campo Opcional: Descrição */}
          <div>
            <label className="block text-xs font-bold text-[#827780] uppercase tracking-wider mb-1">
              Observações / Notas do Empreendimento
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Programa habitacional, tipologia, área comum..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl text-[#28232A] focus:outline-none focus:border-[#F04491] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#827780] hover:text-[#28232A] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 min-h-[40px] bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>{isEditing ? 'Atualizar Residencial' : 'Salvar Residencial'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

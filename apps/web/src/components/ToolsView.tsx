import React, { useState, useEffect } from 'react'
import {
  Wrench,
  FileText,
  Files,
  Scissors,
  Image as ImageIcon,
  RotateCw,
  Stamp,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  FileCheck,
  Layers,
  Sliders,
} from 'lucide-react'
import {
  mergePdfs,
  splitPdf,
  imagesToPdf,
  rotatePdf,
  addWatermarkAndPagination,
  convertAndCompressImage,
  logProcessingJobToSupabase,
  type ToolType,
} from '../services/pdfToolsService'
import { supabase } from '../lib/supabaseClient'

interface ToolsViewProps {
  onBackToDashboard?: () => void
}

interface ToolDefinition {
  id: ToolType
  title: string
  shortLabel: string
  description: string
  badge: string
  icon: React.ReactNode
  acceptedFileTypes: string
  multiple: boolean
}

export const ToolsView: React.FC<ToolsViewProps> = ({ onBackToDashboard }) => {
  const [activeTool, setActiveTool] = useState<ToolType>('merge_pdf')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultBlob, setResultBlob] = useState<{ blob: Blob; filename: string; size: number } | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Opções específicas de cada ferramenta
  const [splitRange, setSplitRange] = useState('1-2')
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90)
  const [watermarkText, setWatermarkText] = useState('CONFIDENCIAL — SUAS')
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.15)
  const [includePagination, setIncludePagination] = useState(true)
  const [targetImageFormat, setTargetImageFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg')
  const [imageQuality, setImageQuality] = useState(0.85)

  // Histórico de processamentos do usuário (Supabase)
  const [historyJobs, setHistoryJobs] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const TOOLS: ToolDefinition[] = [
    {
      id: 'merge_pdf',
      title: 'Juntar Múltiplos PDFs',
      shortLabel: 'Juntar PDFs',
      description: 'Funda vários relatórios, pareceres ou certidões em um único arquivo PDF ordenado.',
      badge: 'Mais Usado',
      icon: <Files size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: true,
    },
    {
      id: 'split_pdf',
      title: 'Dividir ou Extrair Páginas',
      shortLabel: 'Dividir PDF',
      description: 'Extraia páginas específicas de um processo ou separe um dossiê extenso.',
      badge: 'Páginas',
      icon: <Scissors size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },
    {
      id: 'images_to_pdf',
      title: 'Imagens para PDF A4',
      shortLabel: 'Fotos para PDF',
      description: 'Converta fotos de visitas domiciliares, laudos e documentos em um PDF unificado.',
      badge: 'Território',
      icon: <ImageIcon size={20} />,
      acceptedFileTypes: 'image/*',
      multiple: true,
    },
    {
      id: 'convert_image',
      title: 'Conversor & Otimizador de Imagens',
      shortLabel: 'Converter Imagens',
      description: 'Converta entre PNG, JPG e WEBP e reduza o peso das fotos para limites do CadÚnico.',
      badge: 'Compressão',
      icon: <Sliders size={20} />,
      acceptedFileTypes: 'image/*',
      multiple: false,
    },
    {
      id: 'rotate_pdf',
      title: 'Girar Páginas de PDF',
      shortLabel: 'Girar PDF',
      description: 'Corrija documentos escaneados de cabeça para baixo ou de lado com rotação de 90°/180°/270°.',
      badge: 'Correção',
      icon: <RotateCw size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },
    {
      id: 'watermark_pdf',
      title: 'Marca-d’água & Numeração',
      shortLabel: 'Carimbo & Paginação',
      description: 'Carimbe alertas de sigilo profissional ("CONFIDENCIAL") e numere as páginas no rodapé.',
      badge: 'Segurança',
      icon: <Stamp size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },
  ]

  const currentToolSpec = TOOLS.find((t) => t.id === activeTool) || TOOLS[0]

  // Carregar histórico de auditoria
  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const { data, error } = await (supabase.rpc as any)('get_user_document_jobs', { p_limit: 8 })
      if (!error && data) {
        setHistoryJobs(data)
      }
    } catch {
      // Fallback gracioso
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // Limpar arquivos ao trocar de ferramenta
  const handleSwitchTool = (tool: ToolType) => {
    setActiveTool(tool)
    setSelectedFiles([])
    setResultBlob(null)
  }

  // Manipular upload de arquivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const incoming = Array.from(e.target.files)
    if (currentToolSpec.multiple) {
      setSelectedFiles((prev) => [...prev, ...incoming])
    } else {
      setSelectedFiles([incoming[0]])
    }
    setResultBlob(null)
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setResultBlob(null)
  }

  // Executar processamento
  const handleExecuteProcessing = async () => {
    if (selectedFiles.length === 0) {
      showToast('Selecione os arquivos antes de processar.', 'error')
      return
    }

    setIsProcessing(true)
    try {
      let result: { blob: Blob; filename: string; size: number }

      switch (activeTool) {
        case 'merge_pdf':
          result = await mergePdfs(selectedFiles)
          break

        case 'split_pdf':
          result = await splitPdf(selectedFiles[0], splitRange)
          break

        case 'images_to_pdf':
          result = await imagesToPdf(selectedFiles)
          break

        case 'convert_image':
          const converted = await convertAndCompressImage(selectedFiles[0], targetImageFormat, imageQuality)
          result = {
            blob: converted.blob,
            filename: converted.filename,
            size: converted.size,
          }
          break

        case 'rotate_pdf':
          result = await rotatePdf(selectedFiles[0], rotationAngle)
          break

        case 'watermark_pdf':
          result = await addWatermarkAndPagination(selectedFiles[0], watermarkText, {
            opacity: watermarkOpacity,
            includePageNumbers: includePagination,
          })
          break

        default:
          throw new Error('Ferramenta não selecionada.')
      }

      setResultBlob(result)
      showToast('Processamento concluído com sucesso!')

      // Registrar auditoria no Supabase sem trafegar o conteúdo
      await logProcessingJobToSupabase(
        activeTool,
        selectedFiles[0]?.name || 'arquivo',
        result.filename.split('.').pop() || 'pdf',
        result.size
      )
      loadHistory()
    } catch (err: any) {
      showToast(err.message || 'Erro durante o processamento do documento.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  // Download do arquivo gerado
  const handleDownloadResult = () => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = resultBlob.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    showToast(`Download de "${resultBlob.filename}" iniciado.`)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs md:text-sm font-semibold transition-all border ${
            toastMessage.type === 'success'
              ? 'bg-[#EBF7F1] text-[#36A879] border-[#36A879]/30'
              : 'bg-[#FCE8E6] text-[#D93025] border-[#D93025]/30'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Principal da Central de Ferramentas */}
      <div className="bg-white rounded-3xl p-6 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#F04491] font-bold text-xs uppercase tracking-wider mb-1">
            <Wrench size={16} />
            <span>Central de Ferramentas & Utilitários Seguros</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
            Ferramentas PDF, Conversores & Otimização
          </h1>
          <p className="text-xs text-[#827780] mt-1 max-w-2xl leading-relaxed">
            Junte PDFs, divida páginas, converta fotos de visitas em PDF A4, comprima imagens e adicione marcas de sigilo diretamente no seu computador.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF7F1] text-[#36A879] text-[11px] font-bold border border-[#36A879]/20">
            <ShieldCheck size={14} />
            <span>100% no Navegador (Privacidade LGPD)</span>
          </div>
        </div>
      </div>

      {/* Grid de Ferramentas / Seletor Superior */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {TOOLS.map((tool) => {
          const isSelected = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => handleSwitchTool(tool.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[105px] group ${
                isSelected
                  ? 'bg-[#FCE5ED] border-[#F04491] text-[#F04491] shadow-[0_4px_12px_rgba(240,68,145,0.15)] ring-1 ring-[#F04491]'
                  : 'bg-white border-[#F6E4EC] text-[#28232A] hover:border-[#F58BB5]/60 hover:bg-[#FFF9FB]'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={isSelected ? 'text-[#F04491]' : 'text-[#827780] group-hover:text-[#F04491]'}>
                  {tool.icon}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isSelected ? 'bg-[#F04491] text-white' : 'bg-[#FFF9FB] text-[#827780] border border-[#F6E4EC]'
                  }`}
                >
                  {tool.badge}
                </span>
              </div>
              <div>
                <span className="text-xs font-black block leading-tight tracking-tight mt-2">
                  {tool.shortLabel}
                </span>
                <span className="text-[10px] text-[#827780] line-clamp-1 block mt-0.5">
                  {tool.title}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Área Central: Caixa da Ferramenta Ativa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Principal de Upload e Ação (2 colunas) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-5">
            {/* Cabeçalho da Ferramenta */}
            <div className="border-b border-[#F6E4EC]/80 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[#F04491]">{currentToolSpec.icon}</span>
                <h2 className="text-base md:text-lg font-black text-[#28232A]">
                  {currentToolSpec.title}
                </h2>
              </div>
              <p className="text-xs text-[#827780] mt-0.5">
                {currentToolSpec.description}
              </p>
            </div>

            {/* Parâmetros Específicos da Ferramenta */}
            {activeTool === 'split_pdf' && (
              <div className="p-4 bg-[#FFF9FB] rounded-2xl border border-[#F6E4EC] space-y-2">
                <label className="text-xs font-bold text-[#28232A] block">
                  Intervalo de Páginas para Extração:
                </label>
                <input
                  type="text"
                  value={splitRange}
                  onChange={(e) => setSplitRange(e.target.value)}
                  placeholder="Ex: 1-3 ou 1, 4, 7-10"
                  className="w-full p-2.5 bg-white rounded-xl border border-[#F6E4EC] text-xs font-semibold focus:outline-none focus:border-[#F04491] focus:ring-2 focus:ring-[#F04491]/20"
                />
                <span className="text-[11px] text-[#827780] block">
                  Informe números separados por vírgula ou faixas com traço (ex: "1-2, 5").
                </span>
              </div>
            )}

            {activeTool === 'rotate_pdf' && (
              <div className="p-4 bg-[#FFF9FB] rounded-2xl border border-[#F6E4EC] space-y-2">
                <label className="text-xs font-bold text-[#28232A] block">
                  Ângulo de Rotação para a Direita:
                </label>
                <div className="flex items-center gap-3">
                  {([90, 180, 270] as const).map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setRotationAngle(deg)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        rotationAngle === deg
                          ? 'bg-[#F04491] text-white shadow-xs'
                          : 'bg-white border border-[#F6E4EC] text-[#827780] hover:text-[#28232A]'
                      }`}
                    >
                      {deg}° Horário
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === 'watermark_pdf' && (
              <div className="p-4 bg-[#FFF9FB] rounded-2xl border border-[#F6E4EC] space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#28232A] block mb-1">
                    Texto do Carimbo / Marca-d’água:
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Ex: CONFIDENCIAL / SIGILOSO"
                    className="w-full p-2.5 bg-white rounded-xl border border-[#F6E4EC] text-xs font-semibold focus:outline-none focus:border-[#F04491]"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs text-[#28232A] font-semibold flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePagination}
                      onChange={(e) => setIncludePagination(e.target.checked)}
                      className="rounded accent-[#F04491] w-4 h-4 cursor-pointer"
                    />
                    <span>Incluir Numeração de Páginas no Rodapé ("Página X de Y")</span>
                  </label>
                </div>
              </div>
            )}

            {activeTool === 'convert_image' && (
              <div className="p-4 bg-[#FFF9FB] rounded-2xl border border-[#F6E4EC] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#28232A] block mb-1">
                    Formato de Saída:
                  </label>
                  <select
                    value={targetImageFormat}
                    onChange={(e) => setTargetImageFormat(e.target.value as any)}
                    className="w-full p-2.5 bg-white rounded-xl border border-[#F6E4EC] text-xs font-semibold focus:outline-none focus:border-[#F04491]"
                  >
                    <option value="image/jpeg">JPEG (.jpg) — Leve para o CadÚnico</option>
                    <option value="image/png">PNG (.png) — Alta nitidez</option>
                    <option value="image/webp">WEBP (.webp) — Supercompacto</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#28232A] block mb-1">
                    Qualidade / Compressão: {Math.round(imageQuality * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={imageQuality}
                    onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                    className="w-full accent-[#F04491] cursor-pointer mt-2"
                  />
                </div>
              </div>
            )}

            {/* Zona de Drop e Upload */}
            <div className="border-2 border-dashed border-[#F6E4EC] hover:border-[#F04491] rounded-3xl p-6 text-center transition-all bg-[#FFF9FB]/50 relative">
              <input
                type="file"
                multiple={currentToolSpec.multiple}
                accept={currentToolSpec.acceptedFileTypes}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 rounded-2xl bg-[#FCE5ED] text-[#F04491] flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload size={22} />
              </div>
              <span className="text-sm font-bold text-[#28232A] block">
                Clique para selecionar ou arraste arquivos aqui
              </span>
              <span className="text-xs text-[#827780] block mt-1">
                Formatos aceitos: {currentToolSpec.acceptedFileTypes} • {currentToolSpec.multiple ? 'Múltiplos arquivos permitidos' : '1 arquivo por vez'}
              </span>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#28232A]">
                  <span>Arquivos Selecionados ({selectedFiles.length}):</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFiles([])
                      setResultBlob(null)
                    }}
                    className="text-[#D93025] hover:underline cursor-pointer"
                  >
                    Limpar todos
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 no-scrollbar">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-[#F6E4EC] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-6 h-6 rounded-lg bg-[#FCE5ED] text-[#F04491] font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-[#28232A] truncate block">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-[#827780] shrink-0">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 text-[#827780] hover:text-[#D93025] cursor-pointer rounded-lg hover:bg-[#FCE8E6]"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botão de Processamento */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleExecuteProcessing}
                disabled={isProcessing || selectedFiles.length === 0}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] text-white font-bold text-xs md:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processando localmente no navegador...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Executar {currentToolSpec.shortLabel}</span>
                  </>
                )}
              </button>
            </div>

            {/* Painel de Download de Sucesso */}
            {resultBlob && (
              <div className="p-4 rounded-2xl bg-[#EBF7F1] border border-[#36A879]/30 flex items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#36A879] text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-black text-[#28232A] block truncate">
                      {resultBlob.filename}
                    </span>
                    <span className="text-[11px] text-[#36A879] font-bold block">
                      Pronto para salvar • {formatFileSize(resultBlob.size)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadResult}
                  className="px-5 py-2.5 rounded-xl bg-[#36A879] hover:bg-[#2e8f66] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Download size={15} />
                  <span>Baixar Arquivo</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Painel Lateral: Histórico de Auditoria & Segurança LGPD (1 coluna) */}
        <div className="space-y-6">
          {/* Card de Sigilo e LGPD */}
          <div className="bg-gradient-to-br from-white to-[#FFF9FB] p-5 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-3">
            <div className="flex items-center gap-2 text-[#36A879]">
              <ShieldCheck size={20} />
              <h3 className="font-extrabold text-sm text-[#28232A]">Sigilo Ético Profissional</h3>
            </div>
            <p className="text-xs text-[#827780] leading-relaxed">
              Diferente de sites públicos na internet, todas as operações desta central executam <strong>diretamente na memória RAM do seu navegador</strong>.
            </p>
            <div className="space-y-1.5 text-[11px] text-[#827780]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#36A879] shrink-0" />
                <span>Zero envio de certidões a terceiros</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#36A879] shrink-0" />
                <span>Compatível com Código de Ética CFESS</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#36A879] shrink-0" />
                <span>Arquivos não salvos em servidores</span>
              </div>
            </div>
          </div>

          {/* Histórico Recente de Operações */}
          <div className="bg-white rounded-3xl p-5 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-3">
            <div className="flex items-center justify-between border-b border-[#F6E4EC]/80 pb-2.5">
              <h3 className="text-xs font-black text-[#28232A] uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck size={14} className="text-[#F04491]" />
                <span>Histórico de Operações</span>
              </h3>
              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="text-[#827780] hover:text-[#F04491] p-1"
                title="Atualizar histórico"
              >
                <RefreshCw size={12} className={isLoadingHistory ? 'animate-spin' : ''} />
              </button>
            </div>

            {historyJobs.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#827780]">
                Nenhuma operação registrada ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {historyJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-2.5 rounded-xl bg-[#FFF9FB] border border-[#F6E4EC] flex items-center justify-between text-xs"
                  >
                    <div className="truncate min-w-0 pr-2">
                      <span className="font-bold text-[#28232A] block truncate">
                        {job.operation_type?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#827780] block truncate">
                        {job.original_filename || 'arquivo'} • {formatFileSize(job.file_size || 0)}
                      </span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 bg-[#EBF7F1] text-[#36A879]">
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

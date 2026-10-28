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
  FileCode,
  FileUp,
  Minimize2,
  FileMinus,
  Lock,
} from 'lucide-react'
import {
  mergePdfs,
  splitPdf,
  imagesToPdf,
  docxToPdf,
  pdfToDocx,
  compressPdf,
  rotatePdf,
  deletePagesFromPdf,
  addWatermarkAndPagination,
  convertAndCompressImage,
  logProcessingJobToSupabase,
  type ToolType,
} from '../services/pdfToolsService'
import { supabase } from '../lib/supabaseClient'

interface ToolsViewProps {
  onBackToDashboard?: () => void
  onOpenDocumentEditor?: () => void
}

type ToolCategory = 'todas' | 'converter' | 'organizar' | 'otimizar' | 'seguranca'

interface ToolDefinition {
  id: ToolType | 'open_editor_word'
  title: string
  shortLabel: string
  description: string
  category: ToolCategory
  badge: string
  icon: React.ReactNode
  acceptedFileTypes: string
  multiple: boolean
}

export const ToolsView: React.FC<ToolsViewProps> = ({ onBackToDashboard, onOpenDocumentEditor }) => {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('todas')
  const [activeTool, setActiveTool] = useState<ToolType>('merge_pdf')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultBlob, setResultBlob] = useState<{ blob: Blob; filename: string; size: number; originalSize?: number; message?: string } | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Opções específicas de ferramentas
  const [splitRange, setSplitRange] = useState('1-2')
  const [pagesToDelete, setPagesToDelete] = useState('2')
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90)
  const [watermarkText, setWatermarkText] = useState('CONFIDENCIAL — SUAS')
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.15)
  const [includePagination, setIncludePagination] = useState(true)
  const [targetImageFormat, setTargetImageFormat] = useState<'image/jpeg' | 'image/png' | 'image/webp'>('image/jpeg')
  const [imageQuality, setImageQuality] = useState(0.85)

  // Histórico de auditoria
  const [historyJobs, setHistoryJobs] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const TOOLS: ToolDefinition[] = [
    // 1. Organizar & Otimizar
    {
      id: 'merge_pdf',
      title: 'Unir Vários PDFs',
      shortLabel: 'Juntar PDFs',
      description: 'Funda múltiplos relatórios, pareceres ou certidões em um único arquivo PDF ordenado.',
      category: 'organizar',
      badge: 'Popular',
      icon: <Files size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: true,
    },
    {
      id: 'split_pdf',
      title: 'Dividir ou Extrair Páginas',
      shortLabel: 'Dividir PDF',
      description: 'Extraia páginas ou intervalos de um processo extenso (ex: "1-3, 5").',
      category: 'organizar',
      badge: 'Intervalos',
      icon: <Scissors size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },
    {
      id: 'delete_pages',
      title: 'Excluir Páginas de PDF',
      shortLabel: 'Remover Páginas',
      description: 'Elimine páginas em branco, termos desnecessários ou folhas excedentes de um PDF.',
      category: 'organizar',
      badge: 'Limpeza',
      icon: <FileMinus size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },
    {
      id: 'rotate_pdf',
      title: 'Girar Páginas de PDF',
      shortLabel: 'Girar PDF',
      description: 'Corrija documentos escaneados de cabeça para baixo ou de lado (90°/180°/270°).',
      category: 'organizar',
      badge: 'Orientação',
      icon: <RotateCw size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },
    {
      id: 'compress_pdf',
      title: 'Comprimir & Reduzir PDF',
      shortLabel: 'Comprimir PDF',
      description: 'Otimize a estrutura de fluxos do PDF para reduzir o tamanho sem perder legibilidade.',
      category: 'otimizar',
      badge: 'Leve',
      icon: <Minimize2 size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },

    // 2. Conversores
    {
      id: 'images_to_pdf',
      title: 'Fotos / Imagens para PDF A4',
      shortLabel: 'Fotos para PDF',
      description: 'Converta fotos de visitas domiciliares, laudos e comprovantes em um PDF A4 limpo.',
      category: 'converter',
      badge: 'Território',
      icon: <ImageIcon size={20} />,
      acceptedFileTypes: 'image/*',
      multiple: true,
    },
    {
      id: 'docx_to_pdf',
      title: 'Word (.docx) para PDF',
      shortLabel: 'Word para PDF',
      description: 'Converta seus relatórios e arquivos .docx diretamente em PDF pronto para assinatura.',
      category: 'converter',
      badge: 'DOCX ➔ PDF',
      icon: <FileUp size={20} />,
      acceptedFileTypes: '.docx,.doc',
      multiple: false,
    },
    {
      id: 'pdf_to_docx',
      title: 'PDF para Word (.docx)',
      shortLabel: 'PDF para Word',
      description: 'Converta um documento PDF em arquivo Microsoft Word (.docx) editável na sua máquina.',
      category: 'converter',
      badge: 'PDF ➔ DOCX',
      icon: <FileCode size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },
    {
      id: 'convert_image',
      title: 'Conversor de Imagens (PNG/JPG/WEBP)',
      shortLabel: 'Converter Imagens',
      description: 'Converta formatos e ajuste compressão para respeitar o limite de 25MB do CadÚnico.',
      category: 'otimizar',
      badge: 'Canvas API',
      icon: <Sliders size={20} />,
      acceptedFileTypes: 'image/*',
      multiple: false,
    },

    // 3. Segurança & Edição
    {
      id: 'watermark_pdf',
      title: 'Marca-d’água & Numeração',
      shortLabel: 'Carimbo & Sigilo',
      description: 'Carimbe avisos de sigilo profissional ("CONFIDENCIAL — SUAS") e numere as páginas.',
      category: 'seguranca',
      badge: 'CFESS / LGPD',
      icon: <Stamp size={20} />,
      acceptedFileTypes: '.pdf',
      multiple: false,
    },
    {
      id: 'open_editor_word',
      title: 'Editor Word com Modelos SUAS',
      shortLabel: 'Editor de Textos',
      description: 'Crie e edite documentos do zero com 14 modelos oficiais e folha timbrada institucional.',
      category: 'seguranca',
      badge: '14 Modelos',
      icon: <FileText size={20} />,
      acceptedFileTypes: '',
      multiple: false,
    },
  ]

  const filteredTools = TOOLS.filter(
    (t) => activeCategory === 'todas' || t.category === activeCategory
  )

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
      // Fallback silencioso
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // Selecionar ferramenta
  const handleSelectTool = (toolId: ToolType | 'open_editor_word') => {
    if (toolId === 'open_editor_word') {
      if (onOpenDocumentEditor) {
        onOpenDocumentEditor()
      } else {
        showToast('Navegue até a aba Documentos Word no menu lateral.')
      }
      return
    }

    setActiveTool(toolId)
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
      let result: { blob: Blob; filename: string; size: number; originalSize?: number; message?: string }

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

        case 'docx_to_pdf':
          result = await docxToPdf(selectedFiles[0])
          break

        case 'pdf_to_docx':
          result = await pdfToDocx(selectedFiles[0])
          break

        case 'compress_pdf':
          result = await compressPdf(selectedFiles[0])
          break

        case 'delete_pages':
          const pagesArr = pagesToDelete
            .split(',')
            .map((p) => parseInt(p.trim(), 10))
            .filter((p) => !isNaN(p))
          result = await deletePagesFromPdf(selectedFiles[0], pagesArr)
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

        case 'convert_image':
          const converted = await convertAndCompressImage(selectedFiles[0], targetImageFormat, imageQuality)
          result = {
            blob: converted.blob,
            filename: converted.filename,
            size: converted.size,
            originalSize: converted.originalSize,
          }
          break

        default:
          throw new Error('Ferramenta não selecionada.')
      }

      setResultBlob(result)
      showToast(result.message || 'Processamento concluído com sucesso!')

      // Registrar auditoria no Supabase sem trafegar conteúdo sensível
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

  // Download do arquivo
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
    showToast(`Download de "${resultBlob.filename}" concluído.`)
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
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs md:text-sm font-semibold transition-all border animate-fade-in ${
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
            <span>Central de Utilitários — Estilo iLovePDF para o SUAS</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
            Central de Ferramentas & Documentos
          </h1>
          <p className="text-xs text-[#827780] mt-1 max-w-2xl leading-relaxed">
            Unir PDFs, dividir páginas, converter Word para PDF, fotos para PDF A4, comprimir arquivos e aplicar carimbos éticos sem limites e com 100% de sigilo no seu computador.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF7F1] text-[#36A879] text-[11px] font-bold border border-[#36A879]/20 shadow-xs">
            <ShieldCheck size={14} />
            <span>100% no Navegador (Privacidade LGPD)</span>
          </div>
        </div>
      </div>

      {/* Filtros de Categoria Estilo iLovePDF */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'todas', label: 'Todas as Ferramentas' },
          { id: 'organizar', label: 'Organizar & Dividir PDF' },
          { id: 'converter', label: 'Conversores (PDF / Word / Fotos)' },
          { id: 'otimizar', label: 'Otimizar & Comprimir' },
          { id: 'seguranca', label: 'Carimbos & Segurança' },
        ].map((cat) => {
          const isSelected = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as ToolCategory)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#F04491] text-white shadow-[0_4px_12px_rgba(240,68,145,0.2)]'
                  : 'bg-white text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED]/40 border border-[#F6E4EC]'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Grid de Ferramentas / Cartões Interativos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {filteredTools.map((tool) => {
          const isSelected = activeTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => handleSelectTool(tool.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[120px] group ${
                isSelected
                  ? 'bg-[#FCE5ED] border-[#F04491] text-[#F04491] shadow-[0_4px_14px_rgba(240,68,145,0.18)] ring-1 ring-[#F04491]'
                  : 'bg-white border-[#F6E4EC] text-[#28232A] hover:border-[#F58BB5]/60 hover:bg-[#FFF9FB] hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-white text-[#F04491]' : 'bg-[#FCE5ED] text-[#F04491]'
                  }`}
                >
                  {tool.icon}
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isSelected ? 'bg-[#F04491] text-white' : 'bg-[#FFF9FB] text-[#827780] border border-[#F6E4EC]'
                  }`}
                >
                  {tool.badge}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-black block leading-tight tracking-tight">
                  {tool.title}
                </span>
                <span className="text-[11px] text-[#827780] line-clamp-2 block mt-1 leading-snug">
                  {tool.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Área da Ferramenta Ativa */}
      {currentToolSpec.id !== 'open_editor_word' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel Principal de Upload e Ação (2 colunas) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-5">
              {/* Título da Ferramenta */}
              <div className="border-b border-[#F6E4EC]/80 pb-4 flex items-center justify-between">
                <div>
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
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-[#FCE5ED] text-[#F04491] shrink-0">
                  {currentToolSpec.badge}
                </span>
              </div>

              {/* Opções Específicas */}
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
                    className="w-full p-2.5 bg-white rounded-xl border border-[#F6E4EC] text-xs font-semibold focus:outline-none focus:border-[#F04491]"
                  />
                  <span className="text-[11px] text-[#827780] block">
                    Informe páginas separadas por vírgula ou faixas com traço (ex: "1-2, 5").
                  </span>
                </div>
              )}

              {activeTool === 'delete_pages' && (
                <div className="p-4 bg-[#FFF9FB] rounded-2xl border border-[#F6E4EC] space-y-2">
                  <label className="text-xs font-bold text-[#28232A] block">
                    Páginas para Excluir do Documento:
                  </label>
                  <input
                    type="text"
                    value={pagesToDelete}
                    onChange={(e) => setPagesToDelete(e.target.value)}
                    placeholder="Ex: 2 ou 2, 4, 7"
                    className="w-full p-2.5 bg-white rounded-xl border border-[#F6E4EC] text-xs font-semibold focus:outline-none focus:border-[#F04491]"
                  />
                  <span className="text-[11px] text-[#827780] block">
                    As páginas informadas serão removidas do PDF final.
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
                      placeholder="Ex: CONFIDENCIAL — SUAS / CÓPIA CONTROLADA"
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
                      Formato de Saída Desejado:
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
                      Taxa de Qualidade / Compressão: {Math.round(imageQuality * 100)}%
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
                  Formatos aceitos: {currentToolSpec.acceptedFileTypes || 'Qualquer'} • {currentToolSpec.multiple ? 'Múltiplos arquivos permitidos' : '1 arquivo por vez'}
                </span>
              </div>

              {/* Lista de Arquivos Selecionados */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#28232A]">
                    <span>Arquivos Prontos para Processar ({selectedFiles.length}):</span>
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
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-tr from-[#F04491] to-[#F58BB5] text-white font-bold text-xs md:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Processando com segurança no navegador...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Processar Arquivo com {currentToolSpec.shortLabel}</span>
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
                        {resultBlob.originalSize && resultBlob.originalSize > resultBlob.size && (
                          <span className="ml-1 text-[10px] text-gray-500 font-normal">
                            (de {formatFileSize(resultBlob.originalSize)})
                          </span>
                        )}
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

          {/* Painel Lateral: Histórico de Auditoria & Sigilo LGPD (1 coluna) */}
          <div className="space-y-6">
            {/* Card de Sigilo Ético */}
            <div className="bg-gradient-to-br from-white to-[#FFF9FB] p-5 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-3">
              <div className="flex items-center gap-2 text-[#36A879]">
                <ShieldCheck size={20} />
                <h3 className="font-extrabold text-sm text-[#28232A]">Sigilo Ético Profissional</h3>
              </div>
              <p className="text-xs text-[#827780] leading-relaxed">
                Todas as operações desta central executam <strong>diretamente na memória RAM do seu navegador</strong>.
              </p>
              <div className="space-y-1.5 text-[11px] text-[#827780]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#36A879] shrink-0" />
                  <span>Zero envio de laudos ou certidões a terceiros</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#36A879] shrink-0" />
                  <span>Conformidade com o Código de Ética CFESS</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-[#36A879] shrink-0" />
                  <span>Nenhum arquivo armazenado em servidores externos</span>
                </div>
              </div>
            </div>

            {/* Histórico Recente de Trabalhos */}
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
                  Nenhuma operação registrada recentemente.
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
      )}
    </div>
  )
}

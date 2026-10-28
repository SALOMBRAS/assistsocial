/**
 * AssistSocial - PDF & Document Processing Tools Service
 * Operações 100% locais no navegador com privacidade absoluta (LGPD/CFESS)
 * utilizando pdf-lib e HTML5 Canvas API.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import { supabase } from '../lib/supabaseClient'

export type ToolType =
  | 'merge_pdf'
  | 'split_pdf'
  | 'images_to_pdf'
  | 'convert_image'
  | 'rotate_pdf'
  | 'watermark_pdf'

export interface ProcessingJobResult {
  blob: Blob
  filename: string
  size: number
}

/**
 * 1. Juntar múltiplos arquivos PDF em um único documento
 */
export async function mergePdfs(files: File[]): Promise<ProcessingJobResult> {
  if (files.length < 2) {
    throw new Error('Selecione pelo menos 2 arquivos PDF para juntar.')
  }

  const mergedPdf = await PDFDocument.create()

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
    copiedPages.forEach((page) => mergedPdf.addPage(page))
  }

  const pdfBytes = await mergedPdf.save()
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
  const filename = `assistsocial_unificado_${Date.now()}.pdf`

  return { blob, filename, size: blob.size }
}

/**
 * 2. Dividir PDF por intervalo de páginas (ex: "1-3", "2,4-6")
 */
export async function splitPdf(file: File, pageRangeText: string): Promise<ProcessingJobResult> {
  const arrayBuffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const totalPages = sourcePdf.getPageCount()

  // Parse page ranges (1-indexed input converted to 0-indexed)
  const pageIndicesToKeep = new Set<number>()
  const parts = pageRangeText.split(',').map((p) => p.trim())

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim())
      const start = Math.max(1, parseInt(startStr, 10))
      const end = Math.min(totalPages, parseInt(endStr, 10))
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          pageIndicesToKeep.add(i - 1)
        }
      }
    } else {
      const pageNum = parseInt(part, 10)
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pageIndicesToKeep.add(pageNum - 1)
      }
    }
  }

  if (pageIndicesToKeep.size === 0) {
    throw new Error(`Nenhuma página válida informada. O documento possui ${totalPages} página(s).`)
  }

  const newPdf = await PDFDocument.create()
  const sortedIndices = Array.from(pageIndicesToKeep).sort((a, b) => a - b)
  const copiedPages = await newPdf.copyPages(sourcePdf, sortedIndices)
  copiedPages.forEach((page) => newPdf.addPage(page))

  const pdfBytes = await newPdf.save()
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
  const filename = `${file.name.replace(/\.pdf$/i, '')}_paginas_extraidas.pdf`

  return { blob, filename, size: blob.size }
}

/**
 * 3. Converter Imagens (JPG, PNG, WEBP) para um único PDF A4
 */
export async function imagesToPdf(images: File[]): Promise<ProcessingJobResult> {
  if (images.length === 0) {
    throw new Error('Selecione pelo menos uma imagem para converter em PDF.')
  }

  const pdfDoc = await PDFDocument.create()

  // Padrão A4: 595.28 x 841.89 pontos
  const a4Width = 595.28
  const a4Height = 841.89
  const margin = 36 // ~0.5 polegada de margem

  for (const imgFile of images) {
    const arrayBuffer = await imgFile.arrayBuffer()
    let embeddedImage

    if (imgFile.type === 'image/jpeg' || imgFile.type === 'image/jpg') {
      embeddedImage = await pdfDoc.embedJpg(arrayBuffer)
    } else if (imgFile.type === 'image/png') {
      embeddedImage = await pdfDoc.embedPng(arrayBuffer)
    } else {
      // Para WEBP ou outros formatos, converter via Canvas para PNG
      const convertedPngBytes = await convertImageToPngBytes(imgFile)
      embeddedImage = await pdfDoc.embedPng(convertedPngBytes)
    }

    const { width: imgWidth, height: imgHeight } = embeddedImage.scale(1)

    // Ajustar escala proporcional dentro da página A4 com margens
    const maxDrawWidth = a4Width - margin * 2
    const maxDrawHeight = a4Height - margin * 2
    const scaleFactor = Math.min(maxDrawWidth / imgWidth, maxDrawHeight / imgHeight, 1)

    const finalWidth = imgWidth * scaleFactor
    const finalHeight = imgHeight * scaleFactor

    // Centralizar na página A4
    const x = (a4Width - finalWidth) / 2
    const y = (a4Height - finalHeight) / 2

    const page = pdfDoc.addPage([a4Width, a4Height])
    page.drawImage(embeddedImage, {
      x,
      y,
      width: finalWidth,
      height: finalHeight,
    })
  }

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
  const filename = `assistsocial_imagens_${Date.now()}.pdf`

  return { blob, filename, size: blob.size }
}

/**
 * 4. Girar todas ou páginas selecionadas de um PDF
 */
export async function rotatePdf(file: File, rotationAngle: 90 | 180 | 270): Promise<ProcessingJobResult> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const pages = pdfDoc.getPages()

  pages.forEach((page) => {
    const currentAngle = page.getRotation().angle
    page.setRotation(degrees((currentAngle + rotationAngle) % 360))
  })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
  const filename = `${file.name.replace(/\.pdf$/i, '')}_rotacionado.pdf`

  return { blob, filename, size: blob.size }
}

/**
 * 5. Adicionar Marca-d'água e Numeração de Páginas a um PDF
 */
export async function addWatermarkAndPagination(
  file: File,
  watermarkText: string,
  options?: {
    opacity?: number
    includePageNumbers?: boolean
  }
): Promise<ProcessingJobResult> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()
  const totalPages = pages.length
  const opacity = options?.opacity ?? 0.15
  const includePageNumbers = options?.includePageNumbers ?? true

  pages.forEach((page, index) => {
    const { width, height } = page.getSize()

    // 1. Marca d'água diagonal centralizada
    if (watermarkText.trim()) {
      const text = watermarkText.toUpperCase()
      const fontSize = Math.min(width, height) / 12
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      const textHeight = font.heightAtSize(fontSize)

      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: (height - textHeight) / 2,
        size: fontSize,
        font,
        color: rgb(0.94, 0.27, 0.57), // Rosa AssistSocial #F04491
        opacity,
        rotate: degrees(45),
      })
    }

    // 2. Numeração de páginas no rodapé
    if (includePageNumbers) {
      const pageText = `Página ${index + 1} de ${totalPages} • AssistSocial`
      const pageFontSize = 9
      const textWidth = regularFont.widthOfTextAtSize(pageText, pageFontSize)

      page.drawText(pageText, {
        x: (width - textWidth) / 2,
        y: 20,
        size: pageFontSize,
        font: regularFont,
        color: rgb(0.51, 0.47, 0.5), // #827780
        opacity: 0.85,
      })
    }
  })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
  const filename = `${file.name.replace(/\.pdf$/i, '')}_carimbado.pdf`

  return { blob, filename, size: blob.size }
}

/**
 * 6. Conversor de Formato e Compressão de Imagens (PNG/JPG/WEBP)
 */
export async function convertAndCompressImage(
  file: File,
  targetFormat: 'image/jpeg' | 'image/png' | 'image/webp',
  quality = 0.85
): Promise<{ blob: Blob; filename: string; size: number; originalSize: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Falha ao inicializar contexto gráfico Canvas.'))
        return
      }

      // Se converter para JPEG, preencher fundo branco (evitar transparência preta)
      if (targetFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.drawImage(img, 0, 0)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Erro na conversão da imagem.'))
            return
          }

          const ext = targetFormat === 'image/jpeg' ? 'jpg' : targetFormat === 'image/png' ? 'png' : 'webp'
          const filename = `${file.name.replace(/\.[^/.]+$/, '')}_convertida.${ext}`

          resolve({
            blob,
            filename,
            size: blob.size,
            originalSize: file.size,
          })
        },
        targetFormat,
        quality
      )
    }

    img.onerror = () => reject(new Error('Erro ao carregar imagem para conversão.'))
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Utilitário auxiliar para converter qualquer imagem em PNG bytes para o pdf-lib
 */
async function convertImageToPngBytes(file: File): Promise<ArrayBuffer> {
  const { blob } = await convertAndCompressImage(file, 'image/png', 1.0)
  return blob.arrayBuffer()
}

/**
 * 7. Registro de Job no Supabase (Governança e Auditoria sem salvar conteúdo)
 */
export async function logProcessingJobToSupabase(
  operationType: string,
  originalFilename: string,
  outputFormat: string,
  fileSize: number
): Promise<void> {
  try {
    const { data } = await (supabase.rpc as any)('create_document_job', {
      p_operation_type: operationType,
      p_original_filename: originalFilename,
      p_output_format: outputFormat,
      p_metadata: { local_processing: true, client: 'AssistSocial Web' },
    })

    if (data?.job_id) {
      await (supabase.rpc as any)('update_document_job_status', {
        p_job_id: data.job_id,
        p_status: 'completed',
        p_result_filename: originalFilename,
        p_file_size: fileSize,
      })
    }
  } catch (err) {
    // Falha silenciosa no log remoto para não travar o fluxo local do usuário
    console.warn('Registro de auditoria remoto opcional não completado:', err)
  }
}

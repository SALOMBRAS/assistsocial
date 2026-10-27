import { useEffect, useRef } from 'react'

export interface UseModalA11yOptions {
  isOpen: boolean
  onClose: () => void
  closeOnEscape?: boolean
  preventScroll?: boolean
}

/**
 * Hook de acessibilidade e ciclo de vida para modais e gavetas móveis:
 * 1. Fecha com tecla Escape no desktop.
 * 2. Bloqueia a rolagem do corpo da página (body scroll lock) enquanto o modal estiver aberto.
 * 3. Restaura o foco para o elemento disparador ao fechar.
 * 4. Limpa todos os listeners e restaura o estilo original ao desmontar.
 */
export function useModalA11y({
  isOpen,
  onClose,
  closeOnEscape = true,
  preventScroll = true,
}: UseModalA11yOptions): void {
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Salva o elemento que tinha foco antes da abertura para restauração posterior
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement
    }

    // Bloqueia rolagem do fundo
    const originalOverflow = document.body.style.overflow
    if (preventScroll) {
      document.body.style.overflow = 'hidden'
    }

    // Listener para fechar via tecla Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      if (preventScroll) {
        document.body.style.overflow = originalOverflow
      }
      window.removeEventListener('keydown', handleKeyDown)

      // Restaura foco
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        try {
          previousActiveElementRef.current.focus()
        } catch {}
      }
    }
  }, [isOpen, onClose, closeOnEscape, preventScroll])
}

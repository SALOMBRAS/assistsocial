import React, { useState, useMemo } from 'react'
import { useModalA11y } from '../hooks/useModalA11y'
import {
  Building2,
  MapPin,
  Clock,
  FileCheck2,
  Accessibility,
  Phone,
  Mail,
  Search,
  SlidersHorizontal,
  Info,
  ExternalLink,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react'

export interface SocialServiceSpec {
  id: string
  name: string
  organization: string
  category: 'cras' | 'creas' | 'centro_pop' | 'acolhimento' | 'caps' | 'conselho_tutelar'
  target_public: string[]
  municipality: string
  address: string
  regular_schedule: string
  access_requirements: string[]
  accessibility_features: string[]
  contact_phone: string
  contact_email: string
  referral_methods: string
  is_verified: boolean
}

// Catálogo referencial conforme padrão Open Referral / HSDS adaptado à tipologia SUAS
export const HSDS_SAMPLE_SERVICES: SocialServiceSpec[] = [
  {
    id: 'srv-cras-centro',
    name: 'CRAS Central — Centro de Referência de Assistência Social',
    organization: 'Secretaria Municipal de Assistência Social (SMAS)',
    category: 'cras',
    target_public: ['Famílias em vulnerabilidade social', 'Beneficiários do CadÚnico e PBF', 'Idosos'],
    municipality: 'São Paulo',
    address: 'Rua das Flores, 420 — Sé, São Paulo - SP',
    regular_schedule: 'Segunda a Sexta, das 08h00 às 17h00',
    access_requirements: ['Documento oficial com foto (RG/CNH)', 'Comprovante de residência atualizado', 'NIS / CadÚnico'],
    accessibility_features: ['Rampa de acesso', 'Banheiro adaptado PCD', 'Intérprete de LIBRAS'],
    contact_phone: '(11) 3245-1000',
    contact_email: 'cras.centro@prefeitura.sp.gov.br',
    referral_methods: 'Demanda espontânea ou encaminhamento intersetorial via parecer técnico',
    is_verified: true,
  },
  {
    id: 'srv-creas-leste',
    name: 'CREAS Leste — Centro Especializado em Direitos Violados',
    organization: 'Secretaria Municipal de Assistência Social (SMAS)',
    category: 'creas',
    target_public: ['Crianças e adolescentes em risco', 'Mulheres em situação de violência', 'Idosos vítimas de negligência'],
    municipality: 'São Paulo',
    address: 'Avenida Esperança, 1500 — Tatuapé, São Paulo - SP',
    regular_schedule: 'Segunda a Sexta, das 08h30 às 17h30',
    access_requirements: ['Encaminhamento da rede socioassistencial', 'Ofício do Conselho Tutelar ou Judiciário'],
    accessibility_features: ['Rampa de acesso', 'Elevador acessível', 'Banheiro adaptado PCD'],
    contact_phone: '(11) 2091-2300',
    contact_email: 'creas.leste@prefeitura.sp.gov.br',
    referral_methods: 'Encaminhamento prioritário pelo Conselho Tutelar, Ministério Público ou CRAS de referência',
    is_verified: true,
  },
  {
    id: 'srv-pop-sul',
    name: 'Centro POP Sul — Especializado para População em Situação de Rua',
    organization: 'Coordenação de Proteção Social Especial',
    category: 'centro_pop',
    target_public: ['População adulta em situação de rua', 'Migrantes e pessoas em trânsito'],
    municipality: 'São Paulo',
    address: 'Rua do Acolhimento, 78 — Santo Amaro, São Paulo - SP',
    regular_schedule: 'Segunda a Domingo, das 07h00 às 19h00',
    access_requirements: ['Acolhimento sem exigência prévia de documentação (triagem para documentação civil básica)'],
    accessibility_features: ['Acesso ao nível do solo', 'Banheiro com chuveiro adaptado'],
    contact_phone: '(11) 5521-8890',
    contact_email: 'centropop.sul@prefeitura.sp.gov.br',
    referral_methods: 'Procura espontânea ou abordagem social de rua (Serviço Especializado de Abordagem)',
    is_verified: true,
  },
  {
    id: 'srv-caps-centro',
    name: 'CAPS Adulto — Atenção Psicossocial Integrada',
    organization: 'Secretaria Municipal de Saúde em Articulação com SMAS',
    category: 'caps',
    target_public: ['Pessoas com sofrimento mental grave e persistente', 'Famílias com membros em crise'],
    municipality: 'Campinas',
    address: 'Avenida Brasil, 800 — Guanabara, Campinas - SP',
    regular_schedule: 'Segunda a Sexta, das 07h00 às 18h00',
    access_requirements: ['Cartão Nacional de Saúde (SUS)', 'Documento de identificação com foto'],
    accessibility_features: ['Rampa de acesso', 'Banheiro adaptado PCD', 'Piso tátil'],
    contact_phone: '(19) 3232-4400',
    contact_email: 'caps.adulto@campinas.sp.gov.br',
    referral_methods: 'Porta aberta para acolhimento inicial e encaminhamentos pela atenção básica (UBS)',
    is_verified: true,
  },
  {
    id: 'srv-conselho-norte',
    name: 'Conselho Tutelar Região Norte',
    organization: 'Conselho Municipal dos Direitos da Criança e do Adolescente (CMDCA)',
    category: 'conselho_tutelar',
    target_public: ['Crianças e adolescentes com direitos ameaçados ou violados'],
    municipality: 'São Paulo',
    address: 'Rua Voluntários da Pátria, 2100 — Santana, São Paulo - SP',
    regular_schedule: 'Segunda a Sexta, 08h00 às 18h00 (Plantão 24h)',
    access_requirements: ['Notificação de violação de direitos ou demanda espontânea da família'],
    accessibility_features: ['Rampa de acesso', 'Banheiro adaptado PCD'],
    contact_phone: '(11) 2221-7000',
    contact_email: 'ct.norte@cmdca.sp.gov.br',
    referral_methods: 'Denúncia anônima (Disque 100), requisição judicial ou acolhimento emergencial',
    is_verified: true,
  },
]

export const ServicesDirectoryView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTargetPublic, setSelectedTargetPublic] = useState<string>('all')
  const [accessibilityOnly, setAccessibilityOnly] = useState<boolean>(false)
  const [selectedService, setSelectedService] = useState<SocialServiceSpec | null>(null)
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false)

  useModalA11y({
    isOpen: Boolean(selectedService),
    onClose: () => setSelectedService(null),
    closeOnEscape: true,
    preventScroll: true,
  })

  useModalA11y({
    isOpen: isProposalModalOpen,
    onClose: () => setIsProposalModalOpen(false),
    closeOnEscape: true,
    preventScroll: true,
  })

  // Categorias Helpers
  const getCategoryInfo = (cat: string) => {
    switch (cat) {
      case 'cras':
        return { label: 'CRAS (Proteção Básica)', color: 'bg-[#FCE5ED] text-[#F04491] border-[#F58BB5]/40' }
      case 'creas':
        return { label: 'CREAS (Proteção Especial)', color: 'bg-[#EDF2FF] text-[#4B7BFF] border-[#BFDBFE]' }
      case 'centro_pop':
        return { label: 'Centro POP (Pop. de Rua)', color: 'bg-[#FEF8EC] text-[#E59B28] border-[#FED7AA]' }
      case 'caps':
        return { label: 'CAPS (Saúde Mental)', color: 'bg-[#EBF7F1] text-[#36A879] border-[#A7E2C6]' }
      case 'conselho_tutelar':
        return { label: 'Conselho Tutelar', color: 'bg-[#F5EBFF] text-[#9B51E0] border-[#E9D5FF]' }
      case 'acolhimento':
        return { label: 'Acolhimento Institucional', color: 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]' }
      default:
        return { label: 'Serviço Socioassistencial', color: 'bg-gray-100 text-gray-700 border-gray-200' }
    }
  }

  // Filtragem dos serviços
  const filteredServices = useMemo(() => {
    return HSDS_SAMPLE_SERVICES.filter((srv) => {
      if (selectedMunicipality !== 'all' && srv.municipality !== selectedMunicipality) {
        return false
      }
      if (selectedCategory !== 'all' && srv.category !== selectedCategory) {
        return false
      }
      if (selectedTargetPublic !== 'all') {
        const matchesTarget = srv.target_public.some((tp) =>
          tp.toLowerCase().includes(selectedTargetPublic.toLowerCase())
        )
        if (!matchesTarget) return false
      }
      if (accessibilityOnly && srv.accessibility_features.length === 0) {
        return false
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = srv.name.toLowerCase().includes(q)
        const matchOrg = srv.organization.toLowerCase().includes(q)
        const matchAddr = srv.address.toLowerCase().includes(q)
        const matchReq = srv.access_requirements.some((r) => r.toLowerCase().includes(q))
        if (!matchName && !matchOrg && !matchAddr && !matchReq) return false
      }
      return true
    })
  }, [searchTerm, selectedMunicipality, selectedCategory, selectedTargetPublic, accessibilityOnly])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. CABEÇALHO DO DIRETÓRIO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-[#FCE5ED] text-[#F04491]">
              <Building2 size={22} />
            </span>
            <h2 className="text-xl md:text-2xl font-black text-[#28232A] tracking-tight">
              Diretório Municipal de Serviços Sociais
            </h2>
          </div>
          <p className="text-xs text-[#827780] font-medium mt-1">
            Rede socioassistencial intersetorial padronizada conforme especificação HSDS / Open Referral
          </p>
        </div>

        <button
          onClick={() => setIsProposalModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold shadow-[0_4px_12px_rgba(240,68,145,0.25)] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Cadastrar Novo Serviço</span>
        </button>
      </div>

      {/* 2. BANNER INFORMATIVO DE DEPENDÊNCIA DE BACKEND (TRANSPARÊNCIA TÉCNICA) */}
      <div className="p-4 rounded-3xl bg-[#EDF2FF] border border-[#BFDBFE] flex items-start gap-3">
        <Info size={20} className="text-[#4B7BFF] shrink-0 mt-0.5" />
        <div className="text-xs text-[#1E3A8A] space-y-1">
          <p className="font-bold">
            Contrato de Dados HSDS / Open Referral (Aguardando Integração do Backend — Terminal 2)
          </p>
          <p className="leading-relaxed text-[11px] text-[#3B82F6]">
            Esta interface segue o padrão internacional <strong>Human Services Data Specification (HSDS)</strong> e a tipologia oficial do SUAS. A persistência dos serviços em banco depende da migração da tabela dedicada <code>social_services</code> pelo Terminal 2 (Backend). Os registros exibidos abaixo representam a matriz visual ativa para consulta técnica dos assistentes sociais.
          </p>
        </div>
      </div>

      {/* 3. BARRA DE BUSCA E FILTROS HSDS */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] space-y-4">
        {/* Busca textual */}
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#827780]" />
          <input
            type="text"
            placeholder="Buscar por nome do equipamento, organização, bairro ou requisito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491] transition-all"
          />
        </div>

        {/* Linha de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Município */}
          <div>
            <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
              Município
            </label>
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491]"
            >
              <option value="all">Todos os Municípios</option>
              <option value="São Paulo">São Paulo - SP</option>
              <option value="Campinas">Campinas - SP</option>
            </select>
          </div>

          {/* Categoria / Tipologia SUAS */}
          <div>
            <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
              Tipologia / Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491]"
            >
              <option value="all">Todas as Tipologias</option>
              <option value="cras">CRAS (Proteção Social Básica)</option>
              <option value="creas">CREAS (Média Complexidade)</option>
              <option value="centro_pop">Centro POP (População de Rua)</option>
              <option value="acolhimento">Acolhimento Institucional</option>
              <option value="caps">CAPS (Saúde Mental)</option>
              <option value="conselho_tutelar">Conselho Tutelar</option>
            </select>
          </div>

          {/* Público Atendido */}
          <div>
            <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">
              Público Atendido
            </label>
            <select
              value={selectedTargetPublic}
              onChange={(e) => setSelectedTargetPublic(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A] focus:outline-none focus:border-[#F04491]"
            >
              <option value="all">Todos os Públicos</option>
              <option value="famílias">Famílias em Vulnerabilidade</option>
              <option value="crianças">Crianças e Adolescentes</option>
              <option value="mulheres">Mulheres em Situação de Violência</option>
              <option value="idosos">Idosos</option>
              <option value="rua">População em Situação de Rua</option>
            </select>
          </div>

          {/* Acessibilidade PCD Toggle */}
          <div className="flex flex-col justify-end">
            <button
              onClick={() => setAccessibilityOnly(!accessibilityOnly)}
              className={`w-full py-2 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                accessibilityOnly
                  ? 'bg-[#36A879] text-white border-[#36A879]'
                  : 'bg-[#FFF9FB] text-[#827780] border-[#F6E4EC] hover:text-[#28232A]'
              }`}
            >
              <Accessibility size={15} />
              <span>Apenas com Acessibilidade PCD</span>
            </button>
          </div>
        </div>

        {/* Resumo de Resultados */}
        <div className="flex items-center justify-between text-xs text-[#827780] pt-2 border-t border-[#F6E4EC]">
          <span className="font-semibold">{filteredServices.length} serviço(s) socioassistencial(is) encontrado(s)</span>
          {(selectedMunicipality !== 'all' || selectedCategory !== 'all' || accessibilityOnly || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedMunicipality('all')
                setSelectedCategory('all')
                setSelectedTargetPublic('all')
                setAccessibilityOnly(false)
              }}
              className="text-[#F04491] hover:underline font-bold cursor-pointer"
            >
              Limpar Todos os Filtros
            </button>
          )}
        </div>
      </div>

      {/* 4. LISTA DE CARDS DE SERVIÇOS HSDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.map((srv) => {
          const cat = getCategoryInfo(srv.category)
          return (
            <div
              key={srv.id}
              className="bg-white rounded-3xl p-5 md:p-6 border border-[#F6E4EC] shadow-[0_2px_12px_rgba(240,68,145,0.03)] hover:shadow-[0_4px_16px_rgba(240,68,145,0.08)] transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cat.color}`}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] font-semibold text-[#827780] bg-[#FFF9FB] px-2 py-0.5 rounded-lg border border-[#F6E4EC]">
                    {srv.municipality}
                  </span>
                </div>

                {/* Título & Organização */}
                <div>
                  <h3 className="text-base font-black text-[#28232A] tracking-tight">{srv.name}</h3>
                  <p className="text-xs text-[#827780] font-semibold mt-0.5">{srv.organization}</p>
                </div>

                {/* Informações Físicas e Horários */}
                <div className="space-y-1.5 pt-1 text-xs text-[#827780]">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-[#F04491] shrink-0 mt-0.5" />
                    <span>{srv.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#827780] shrink-0" />
                    <span>{srv.regular_schedule}</span>
                  </div>
                </div>

                {/* Requisitos de Acesso */}
                <div className="pt-2 border-t border-[#F6E4EC]/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#827780] block mb-1">
                    Requisitos para Acolhimento:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {srv.access_requirements.map((req, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFF9FB] border border-[#F6E4EC] text-[#28232A] font-medium"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Acessibilidade PCD */}
                {srv.accessibility_features.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Accessibility size={13} className="text-[#36A879]" />
                    <span className="text-[10px] font-semibold text-[#36A879]">
                      Acessibilidade: {srv.accessibility_features.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Contatos & Botão Detalhes */}
              <div className="pt-3 border-t border-[#F6E4EC] flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-xs text-[#827780]">
                  <a
                    href={`tel:${srv.contact_phone}`}
                    className="hover:text-[#F04491] flex items-center gap-1 font-semibold"
                    title="Ligar"
                  >
                    <Phone size={13} />
                    <span className="hidden sm:inline">{srv.contact_phone}</span>
                  </a>
                  <a
                    href={`mailto:${srv.contact_email}`}
                    className="hover:text-[#F04491] flex items-center gap-1 font-semibold"
                    title="Enviar e-mail institucional"
                  >
                    <Mail size={13} />
                    <span className="hidden sm:inline">E-mail</span>
                  </a>
                </div>

                <button
                  onClick={() => setSelectedService(srv)}
                  className="px-3 py-1.5 rounded-xl bg-[#FCE5ED] text-[#F04491] hover:bg-[#FAD5E3] text-xs font-bold transition-all cursor-pointer"
                >
                  Ver Ficha HSDS
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 5. MODAL DE FICHA TÉCNICA HSDS */}
      {selectedService && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-detail-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedService(null) }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-[#F6E4EC] shadow-2xl space-y-4 animate-scale-up max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F6E4EC]">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-[#F04491]" />
                <h3 id="service-detail-modal-title" className="text-base font-black text-[#28232A]">Ficha de Serviço — Especificação HSDS</h3>
              </div>
              <button
                type="button"
                aria-label="Fechar ficha"
                onClick={() => setSelectedService(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#28232A]">
              <div>
                <span className="font-bold text-[#827780] uppercase text-[10px]">Nome do Serviço</span>
                <p className="font-black text-sm">{selectedService.name}</p>
              </div>

              <div>
                <span className="font-bold text-[#827780] uppercase text-[10px]">Organização Gestora</span>
                <p className="font-semibold">{selectedService.organization}</p>
              </div>

              <div>
                <span className="font-bold text-[#827780] uppercase text-[10px]">Endereço Físico</span>
                <p>{selectedService.address} ({selectedService.municipality})</p>
              </div>

              <div>
                <span className="font-bold text-[#827780] uppercase text-[10px]">Horários Regulares de Atendimento</span>
                <p>{selectedService.regular_schedule}</p>
              </div>

              <div>
                <span className="font-bold text-[#827780] uppercase text-[10px]">Forma e Canais de Encaminhamento</span>
                <p className="p-3 bg-[#FFF9FB] border border-[#F6E4EC] rounded-2xl leading-relaxed">
                  {selectedService.referral_methods}
                </p>
              </div>

              <div>
                <span className="font-bold text-[#827780] uppercase text-[10px]">Público-Alvo Prioritário</span>
                <ul className="list-disc pl-4 space-y-0.5 mt-1">
                  {selectedService.target_public.map((tp, i) => (
                    <li key={i}>{tp}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-bold text-[#827780] uppercase text-[10px]">Documentação e Requisitos Exigidos</span>
                <ul className="list-disc pl-4 space-y-0.5 mt-1">
                  {selectedService.access_requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F6E4EC] flex justify-end">
              <button
                onClick={() => setSelectedService(null)}
                className="px-4 py-2 bg-[#28232A] text-white rounded-2xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE PROPOSTA DE CADASTRO HSDS (DEMONSTRADOR DE CONTRATO) */}
      {isProposalModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-proposal-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setIsProposalModalOpen(false) }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[#F6E4EC] shadow-2xl space-y-4 animate-scale-up max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F6E4EC]">
              <div className="flex items-center gap-2">
                <Plus size={20} className="text-[#F04491]" />
                <h3 id="service-proposal-modal-title" className="text-base font-black text-[#28232A]">Proposta de Novo Equipamento Socioassistencial</h3>
              </div>
              <button
                type="button"
                aria-label="Fechar proposta"
                onClick={() => setIsProposalModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[#827780] hover:text-[#28232A] hover:bg-[#FCE5ED] cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs text-[#827780] flex items-start gap-2">
              <AlertCircle size={16} className="text-[#F04491] shrink-0 mt-0.5" />
              <span>
                Formulário em conformidade com HSDS. O salvamento direto no banco de dados será ativado quando a migração <code>social_services</code> for liberada pelo Terminal 2 (Backend).
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                alert('Proposta registrada localmente. Integração com API do Terminal 2 pendente.')
                setIsProposalModalOpen(false)
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">Nome do Equipamento / Serviço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: CRAS Esperança"
                  className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">Município e UF</label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: São Paulo - SP"
                  className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#827780] uppercase mb-1">Organização Responsável</label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Secretaria de Desenvolvimento Social"
                  className="w-full px-3 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#28232A]"
                />
              </div>

              <div className="pt-3 border-t border-[#F6E4EC] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProposalModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-[#FFF9FB] border border-[#F6E4EC] text-xs font-semibold text-[#827780] hover:text-[#28232A] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-[#F04491] text-white text-xs font-bold hover:bg-[#DE3380] transition-colors cursor-pointer"
                >
                  Salvar Proposta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * AssistSocial - Document Editor & DOCX Generator Service
 * Geração de arquivos Word (.docx) profissionais com folha timbrada,
 * tabelas, cabeçalhos institucionais, assinaturas e galeria de modelos SUAS.
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Packer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  PageNumber,
  NumberFormat,
  Header,
  Footer,
  ImageRun,
} from 'docx'
import { supabase } from '../lib/supabaseClient'
import {
  OFFICIAL_HEADER_BASE64,
  OFFICIAL_FOOTER_BASE64,
  OFFICIAL_LETTERHEAD_CONFIG,
} from './letterheadAssets'

export interface DocumentBlock {
  id: string
  type: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'bullet' | 'numbered' | 'table' | 'signature'
  text: string
  align?: 'left' | 'center' | 'right' | 'justify'
  bold?: boolean
  italic?: boolean
  underline?: boolean
  tableData?: string[][]
}

export interface LetterheadSettings {
  pageSize: 'A4'
  orientation: 'portrait' | 'landscape'
  fontFamily: 'Calibri' | 'Arial' | 'Times New Roman' | 'Georgia'
  fontSize: number
  lineSpacing: number
  includeLetterhead: boolean
  useOfficialLetterheadImage?: boolean
  institutionName: string
  institutionUnit: string
  institutionAddress: string
  institutionPhone: string
  institutionEmail: string
  includeSignature: boolean
  signerName: string
  signerRole: string
  signerRegistration?: string
  includePageNumbers: boolean
  cityDateLine?: string
  margins: {
    top: number
    bottom: number
    left: number
    right: number
  }
}

export interface EditorDocument {
  id?: string
  owner_id?: string
  title: string
  category: string
  template_id?: string | null
  blocks: DocumentBlock[]
  plain_text?: string
  settings: LetterheadSettings
  created_at?: string
  updated_at?: string
}

export interface DocumentTemplate {
  id: string
  title: string
  category: 'relatorios' | 'pareceres' | 'declaracoes' | 'oficios' | 'geral'
  categoryLabel: string
  description: string
  badge: string
  defaultBlocks: DocumentBlock[]
  defaultSettings: Partial<LetterheadSettings>
}

export const DEFAULT_LETTERHEAD_SETTINGS: LetterheadSettings = {
  pageSize: 'A4',
  orientation: 'portrait',
  fontFamily: 'Calibri',
  fontSize: 12,
  lineSpacing: 1.15,
  includeLetterhead: true,
  useOfficialLetterheadImage: true,
  institutionName: 'PREFEITURA MUNICIPAL DE FORTALEZA — HABITAFOR',
  institutionUnit: 'COORDENADORIA DE PROGRAMAS SOCIAIS (COPS)',
  institutionAddress: 'Secretaria Municipal do Desenvolvimento Habitacional de Fortaleza',
  institutionPhone: '(85) 3452-9366',
  institutionEmail: 'cops.social@fortaleza.ce.gov.br',
  includeSignature: true,
  signerName: 'Janaína Lima',
  signerRole: 'Assistente Social',
  signerRegistration: 'CRESS 3ª Região Nº 17999',
  includePageNumbers: true,
  cityDateLine: 'Fortaleza - CE, ' + new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }),
  margins: { top: 25, bottom: 25, left: 30, right: 20 },
}

/**
 * Galeria Oficial dos 14 Modelos Socioassistenciais do SUAS
 */
export const OFFICIAL_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'relatorio_social',
    title: 'Relatório Social',
    category: 'relatorios',
    categoryLabel: 'Relatórios',
    badge: 'SUAS',
    description: 'Documento descritivo e analítico sobre a situação socioeconômica, habitacional e familiar para fins de concessão de benefícios ou providências protetivas.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'RELATÓRIO SOCIAL', align: 'center', bold: true },
      { id: 'b2', type: 'heading2', text: '1. IDENTIFICAÇÃO DO BENEFICIÁRIO / FAMÍLIA', align: 'left', bold: true },
      { id: 'b3', type: 'paragraph', text: 'Nome do Titular: [Nome Completo]\nData de Nascimento: [DD/MM/AAAA] | Idade: [XX] anos\nCPF: [000.000.000-00] | NIS: [00000000000]\nEndereço: [Rua, Número, Bairro, Município - UF]\nComposição Familiar: [XX] pessoas residentes no domicílio.', align: 'left' },
      { id: 'b4', type: 'heading2', text: '2. SITUAÇÃO HABITACIONAL E TERRITORIAL', align: 'left', bold: true },
      { id: 'b5', type: 'paragraph', text: 'A família reside em imóvel [próprio / alugado / cedido], composto por [X] cômodos, em condições de saneamento básico [regular / precário]. O território é coberto pelo CRAS de referência, com acesso a transporte público e equipamentos de saúde.', align: 'justify' },
      { id: 'b6', type: 'heading2', text: '3. SITUAÇÃO SOCIOECONÔMICA E DE TRABALHO', align: 'left', bold: true },
      { id: 'b7', type: 'paragraph', text: 'A principal fonte de renda é proveniente de [trabalho informal / benefício socioassistencial do Programa Bolsa Família / BPC], totalizando uma renda familiar per capita estimada em R$ [Valor,00], enquadrando a família em situação de vulnerabilidade social.', align: 'justify' },
      { id: 'b8', type: 'heading2', text: '4. PARECER CONCLUSIVO E ENCAMINHAMENTOS', align: 'left', bold: true },
      { id: 'b9', type: 'paragraph', text: 'Diante do exposto e da análise técnica realizada com base nas diretrizes da Política Nacional de Assistência Social (PNAS), sugere-se a inclusão no acompanhamento do PAIF e o deferimento da solicitação requerida.', align: 'justify' },
      { id: 'b10', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
  {
    id: 'estudo_social',
    title: 'Estudo Social Pericial',
    category: 'pareceres',
    categoryLabel: 'Pareceres & Estudos',
    badge: 'Forense / SUAS',
    description: 'Análise aprofundada de dinâmicas familiares, vínculos e direitos violados para subsidiar decisões judiciais ou intersetoriais.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'ESTUDO SOCIAL', align: 'center', bold: true },
      { id: 'b2', type: 'heading2', text: '1. OBJETO E FINALIDADE', align: 'left', bold: true },
      { id: 'b3', type: 'paragraph', text: 'O presente Estudo Social tem por finalidade averiguar as condições de convivência familiar e comunitária da família referenciada, atendendo à requisição do processo nº [XXXXXXX-XX.2026.8.06.0001].', align: 'justify' },
      { id: 'b4', type: 'heading2', text: '2. METODOLOGIA TÉCNICA APLICADA', align: 'left', bold: true },
      { id: 'b5', type: 'paragraph', text: 'Foram realizadas entrevistas individuais, visita domiciliar in loco em [DD/MM/AAAA], análise documental civil e consulta ao prontuário socioassistencial do território.', align: 'justify' },
      { id: 'b6', type: 'heading2', text: '3. HISTÓRICO FAMILIAR E DINÂMICA DE VÍNCULOS', align: 'left', bold: true },
      { id: 'b7', type: 'paragraph', text: 'Identificou-se que a família preserva vínculos afetivos sólidos, inexistindo registros de negligência ou violência física, necessitando contudo de apoio material e fortalecimento da rede de proteção básica.', align: 'justify' },
      { id: 'b8', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
  {
    id: 'parecer_social',
    title: 'Parecer Social Técnico',
    category: 'pareceres',
    categoryLabel: 'Pareceres & Estudos',
    badge: 'Técnico',
    description: 'Manifestação conclusiva do assistente social com fundamentação teórico-metodológica e normativa sobre uma questão social específica.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'PARECER SOCIAL', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'Interessado(a): [Nome do Usuário/Titular]\nAssunto: Avaliação Técnica para Concessão de Benefício Eventual / Moradia Social\nReferência: Processo Administrativo nº [XXXX/2026]', align: 'left' },
      { id: 'b3', type: 'heading2', text: '1. ANÁLISE TÉCNICA E CONTEXTUAL', align: 'left', bold: true },
      { id: 'b4', type: 'paragraph', text: 'Em conformidade com a Lei Orgânica da Assistência Social (LOAS - Lei 8.742/93) e as normativas do Conselho Federal de Serviço Social (CFESS), procede-se à análise da solicitação apresentada.', align: 'justify' },
      { id: 'b5', type: 'heading2', text: '2. CONCLUSÃO PROFISSIONAL', align: 'left', bold: true },
      { id: 'b6', type: 'paragraph', text: 'Considerando os indicadores socioeconômicos levantados e o perfil de hipossuficiência comprovado, emite-se parecer FAVORÁVEL ao pleito em comento.', align: 'justify' },
      { id: 'b7', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
  {
    id: 'visita_domiciliar',
    title: 'Relatório de Visita Técnica e Levantamento Territorial',
    category: 'relatorios',
    categoryLabel: 'Relatórios',
    badge: 'Oficial PMF / SUAS',
    description: 'Modelo base oficial baseado no Relatório de Visita Técnica e Levantamento Territorial (Teleceará / Habitafor / SUAS). Inclui caracterização da comunidade, percurso territorial, levantamento de uso e ocupação de imóveis com tabelas sistematizadas e encaminhamentos.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'COORDENADORIA DE PROGRAMAS SOCIAIS', align: 'center', bold: true },
      { id: 'b2', type: 'heading1', text: 'VISITA TÉCNICA – RELATÓRIO TÉCNICO SOCIAL', align: 'center', bold: true },
      { id: 'b3', type: 'paragraph', text: 'Nos dias [Data da Visita], a equipe técnica da Coordenadoria de Programas Sociais (COPS) da HABITAFOR, composta pela coordenação [Nome do Coordenador(a)], pelas assistentes sociais [Nomes das Assistentes Sociais], contando ainda com apoio de [Apoio Administrativo], realizou visita técnica à comunidade [Nome da Comunidade / Território], no município de Fortaleza/CE. A atividade ocorreu com o objetivo de atualizar o levantamento social e territorial anteriormente realizado na área.', align: 'justify' },
      { id: 'b4', type: 'heading2', text: '1. RECONHECIMENTO INICIAL E PERCURSO TERRITORIAL', align: 'left', bold: true },
      { id: 'b5', type: 'paragraph', text: 'A equipe técnica realizou o reconhecimento inicial da área, sendo acompanhada por lideranças locais e representantes comunitários, que apresentaram à equipe técnica a dinâmica local e conduziram o percurso territorial, fornecendo informações acerca da organização comunitária, ocupação dos imóveis, infraestrutura básica e principais características do território.', align: 'justify' },
      { id: 'b6', type: 'heading2', text: '2. DINÂMICA COMUNITÁRIA E VÍNCULOS SOCIAIS', align: 'left', bold: true },
      { id: 'b7', type: 'paragraph', text: 'Durante o percurso realizado, foi possível observar que a comunidade permanece fortemente vinculada às suas atividades produtivas e comunitárias tradicionais, constituindo espaço de moradia, trabalho e manutenção de vínculos históricos e afetivos das famílias residentes. Identificou-se que grande parte dos moradores reside na área há longos períodos, havendo consolidação de laços de vizinhança e pertencimento territorial.', align: 'justify' },
      { id: 'b8', type: 'heading2', text: '3. LEVANTAMENTO TERRITORIAL E UTILIZAÇÃO DOS IMÓVEIS', align: 'left', bold: true },
      { id: 'b9', type: 'paragraph', text: 'A visita técnica ocorreu por meio de percurso territorial, observação direta dos imóveis e diálogo com moradores da comunidade, possibilitando a atualização das informações referentes à utilização das unidades, situação de ocupação e características territoriais da área.', align: 'justify' },
      {
        id: 'b10',
        type: 'table',
        text: 'Tabela 1 — Utilizações dos Imóveis Identificados',
        tableData: [
          ['SITUAÇÃO IDENTIFICADA', 'QUANTIDADE', 'OBSERVAÇÕES'],
          ['IMÓVEIS DESTINADOS À ATIVIDADE PRODUTIVA / PESCA', '24', 'Apoio à atividade produtiva e guarda de materiais'],
          ['IMÓVEIS DESTINADOS À MORADIA', '24', 'Uso exclusivamente residencial'],
          ['IMÓVEIS DE USO MISTO', '17', 'Moradia e atividades produtivas integradas'],
          ['NÃO IDENTIFICADOS / DESOCUPADOS', '16', 'Sem identificação conclusiva de uso durante a visita'],
          ['OUTROS', '8', 'Estruturas de apoio e embarcações'],
          ['IMÓVEIS DESTINADOS AO COMÉRCIO', '4', 'Pequenos comércios locais e oficinas'],
          ['TOTAL DE UNIDADES IDENTIFICADAS', '93', 'Levantamento territorial atualizado']
        ]
      },
      { id: 'b11', type: 'heading2', text: '4. SITUAÇÃO DE OCUPAÇÃO E PROPRIEDADE DOS IMÓVEIS', align: 'left', bold: true },
      {
        id: 'b12',
        type: 'table',
        text: 'Tabela 2 — Situação de Ocupação e Propriedade',
        tableData: [
          ['PROPRIEDADE DO IMÓVEL', 'QUANTIDADE', 'OBSERVAÇÕES'],
          ['PRÓPRIO', '30', 'Informações prestadas pelos moradores do território'],
          ['ALUGADO', '24', 'Unidades destinadas à locação'],
          ['NÃO IDENTIFICADO', '39', 'Unidades sem informações conclusivas no momento da visita'],
          ['TOTAL DE UNIDADES', '93', 'Levantamento territorial atualizado']
        ]
      },
      { id: 'b13', type: 'heading2', text: '5. CONSIDERAÇÕES FINAIS E ENCAMINHAMENTOS', align: 'left', bold: true },
      { id: 'b14', type: 'paragraph', text: 'Ante o exposto, segue o presente relatório técnico social com a finalidade de subsidiar os encaminhamentos socioassistenciais e intersetoriais necessários junto à rede de proteção social e aos órgãos competentes.', align: 'justify' },
      { id: 'b15', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
  {
    id: 'plano_paif',
    title: 'Plano de Acompanhamento Familiar (PAIF)',
    category: 'relatorios',
    categoryLabel: 'Relatórios',
    badge: 'CRAS / PAIF',
    description: 'Planejamento compartilhado de metas e compromissos entre a equipe do CRAS e a família atendida.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'PLANO DE ACOMPANHAMENTO FAMILIAR — PAIF', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'Unidade: CRAS Regional | Responsável Técnico: [Nome do Assistente Social]\nResponsável Familiar: [Nome da Titular] | NIS: [000.00000.00-0]\nPeríodo Previsto: [Mês/Ano] a [Mês/Ano]', align: 'left' },
      { id: 'b3', type: 'heading2', text: '1. VULNERABILIDADES PRIORITÁRIAS', align: 'left', bold: true },
      { id: 'b4', type: 'paragraph', text: 'Insegurança alimentar moderada; dependente em idade escolar fora da sala de aula; ausência de documentação civil completa.', align: 'justify' },
      { id: 'b5', type: 'heading2', text: '2. OBJETIVOS E METAS PACTUADAS', align: 'left', bold: true },
      { id: 'b6', type: 'numbered', text: 'Regularizar a documentação de RG e certidão de nascimento dos menores até [DD/MM/AAAA];', align: 'left' },
      { id: 'b7', type: 'numbered', text: 'Garantir a matrícula e frequência mínima de 85% na escola municipal;', align: 'left' },
      { id: 'b8', type: 'numbered', text: 'Participar mensalmente das reuniões socioeducativas do grupo PAIF no CRAS.', align: 'left' },
      { id: 'b9', type: 'signature', text: 'Assinatura Profissional e do Titular', align: 'center' },
    ],
  },
  {
    id: 'encaminhamento',
    title: 'Guia de Encaminhamento Intersetorial',
    category: 'oficios',
    categoryLabel: 'Ofícios & Gestão',
    badge: 'Rede SUAS',
    description: 'Documento para direcionar o usuário a serviços de saúde, educação, habitação, defensoria ou trabalho.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'GUIA DE ENCAMINHAMENTO INTERSETORIAL', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'Ao(À): [Nome da Instituição ou Unidade de Destino — Ex: Defensoria Pública / UBS / CAPS]\nEndereço: [Endereço do Órgão Destinatário]\nCidade / UF: [Município - UF]', align: 'left' },
      { id: 'b3', type: 'paragraph', text: 'Prezados(as) Senhores(as),\n\nEncaminhamos o(a) senhor(a) [Nome Completo do Usuário], portador(a) do RG nº [00000000] e CPF nº [000.000.000-00], residente em [Endereço Completo], para atendimento e providências referentes a:\n\n[Descrever o motivo do encaminhamento: ex: Obtenção de gratuidade para emissão de 2ª via de certidão de nascimento / Agendamento para avaliação médica especializada].', align: 'justify' },
      { id: 'b4', type: 'paragraph', text: 'Colocamo-nos à disposição para compartilhamento de informações intersetoriais, reiterando votos de consideração.', align: 'left' },
      { id: 'b5', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
  {
    id: 'declaracao_atendimento',
    title: 'Declaração de Atendimento Socioassistencial',
    category: 'declaracoes',
    categoryLabel: 'Declarações & Atas',
    badge: 'Comprovação',
    description: 'Declaração oficial que atesta o comparecimento ou acompanhamento do cidadão no equipamento social.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'DECLARAÇÃO DE ATENDIMENTO', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'DECLARAMOS, para os devidos fins a que fizer prova, que o(a) senhor(a) [Nome Completo do Cidadão], portador(a) do CPF nº [000.000.000-00], compareceu a esta unidade do Centro de Referência de Assistência Social (CRAS) no dia de hoje, [DD/MM/AAAA], no horário das [HH:mm] às [HH:mm], para atendimento técnico socioassistencial.', align: 'justify' },
      { id: 'b3', type: 'paragraph', text: 'Por ser expressão da verdade, firmamos a presente declaração.', align: 'left' },
      { id: 'b4', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
  {
    id: 'oficio_institucional',
    title: 'Ofício Institucional',
    category: 'oficios',
    categoryLabel: 'Ofícios & Gestão',
    badge: 'Comunicação Oficial',
    description: 'Ofício formal entre órgãos públicos ou entidades da rede socioassistencial para solicitações e informações.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'paragraph', text: 'OFÍCIO Nº [000]/2026 — CRAS/SPS\n\n[Município - UF], [DD de Mês de 2026].\n\nAo(À) Senhor(a):\n[Nome do Destinatário]\n[Cargo do Destinatário]\n[Nome da Instituição Destinatária]\n[Endereço / CEP]', align: 'left' },
      { id: 'b2', type: 'paragraph', text: 'Assunto: [Assunto do Ofício — Ex: Solicitação de providências habitacionais / Vistoria técnica]', align: 'left', bold: true },
      { id: 'b3', type: 'paragraph', text: 'Senhor(a) Diretor(a),\n\n1. Cumprimentando-o(a) cordialmente, servimo-nos do presente para solicitar a Vossa Senhoria as informações técnicas relativas ao andamento do processo de regularização cadastral dos beneficiários do Residencial [Nome do Residencial].\n\n2. Informamos que a equipe técnica local encontra-se à disposição para os alinhamentos necessários.\n\nAtenciosamente,', align: 'justify' },
      { id: 'b4', type: 'signature', text: 'Assinatura da Autoridade / Responsável', align: 'center' },
    ],
  },
  {
    id: 'ata_reuniao',
    title: 'Ata de Reunião Técnica Territorial',
    category: 'declaracoes',
    categoryLabel: 'Declarações & Atas',
    badge: 'Gestão',
    description: 'Registro de deliberações, acordos e encaminhamentos de reuniões de rede ou equipes técnicas.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'ATA DE REUNIÃO TÉCNICA INTERSETORIAL', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'Data: [DD/MM/AAAA] | Início: [HH:mm] | Término: [HH:mm]\nLocal: [Sala de Reuniões do CRAS / Sala Virtual]\nPauta: Alinhamento das ações de busca ativa e regularização documental do Residencial [Nome].', align: 'left' },
      { id: 'b3', type: 'heading2', text: '1. PARTICIPANTES', align: 'left', bold: true },
      { id: 'b4', type: 'paragraph', text: 'Estiveram presentes os seguintes profissionais: [Nome - Cargo/Instituição], [Nome - Cargo/Instituição], [Nome - Cargo/Instituição].', align: 'left' },
      { id: 'b5', type: 'heading2', text: '2. DELIBERAÇÕES E ENCAMINHAMENTOS', align: 'left', bold: true },
      { id: 'b6', type: 'bullet', text: 'Realização de mutirão de atendimento aos sábados para titulares que trabalham durante a semana;', align: 'left' },
      { id: 'b7', type: 'bullet', text: 'Articulação com a Defensoria Pública para coleta de procurações de pessoas acamadas;', align: 'left' },
      { id: 'b8', type: 'signature', text: 'Assinatura dos Presentes', align: 'center' },
    ],
  },
  {
    id: 'termo_consentimento',
    title: 'Termo de Consentimento Livre e Esclarecido (TCLE)',
    category: 'declaracoes',
    categoryLabel: 'Declarações & Atas',
    badge: 'LGPD',
    description: 'Termo de ciência e autorização do usuário para tratamento de dados pessoais conforme a LGPD.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'TERMO DE CONSENTIMENTO E AUTORIZAÇÃO (LGPD)', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'Eu, [Nome Completo do Usuário], portador(a) do RG nº [00000000] e CPF nº [000.000.000-00], DECLARO que fui devidamente informado(a) sobre a finalidade do cadastro socioassistencial no âmbito do Sistema Único de Assistência Social (SUAS).\n\nAUTORIZO expressamente a coleta, o registro técnico e o tratamento dos meus dados pessoais e socioeconômicos para fins exclusivos de acompanhamento familiar, inclusão em programas sociais e defesa de direitos, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).', align: 'justify' },
      { id: 'b3', type: 'signature', text: 'Assinatura do Titular', align: 'center' },
    ],
  },
  {
    id: 'registro_atendimento',
    title: 'Registro de Atendimento e Evolução Familiar',
    category: 'relatorios',
    categoryLabel: 'Relatórios',
    badge: 'Prontuário',
    description: 'Anotação técnica sucinta de atendimento presencial ou domiciliar para histórico do prontuário SUAS.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'REGISTRO DE ATENDIMENTO E EVOLUÇÃO TÉCNICA', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'Data: [DD/MM/AAAA] | Modalidade: Atendimento Individual / Presencial\nTitular: [Nome Completo] | Código do Prontuário: [PRONT-0000]', align: 'left' },
      { id: 'b3', type: 'heading2', text: '1. RELATO DA DEMANDA', align: 'left', bold: true },
      { id: 'b4', type: 'paragraph', text: 'A usuária compareceu ao serviço informando dificuldades financeiras decorrentes de desemprego e solicitando orientação para requisição do BPC para seu filho com deficiência.', align: 'justify' },
      { id: 'b5', type: 'heading2', text: '2. INTERVENÇÃO E ORIENTAÇÕES PRESTADAS', align: 'left', bold: true },
      { id: 'b6', type: 'paragraph', text: 'Orientada sobre os critérios de renda e documentação exigidos pelo INSS. Emitido encaminhamento para a Defensoria Pública do Estado para assistência jurídica gratuita.', align: 'justify' },
      { id: 'b7', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
  {
    id: 'plano_acao',
    title: 'Plano de Ação e Intervenção Comunitária',
    category: 'oficios',
    categoryLabel: 'Ofícios & Gestão',
    badge: 'Planejamento',
    description: 'Planejamento de oficinas, mutirões, visitas territoriais e campanhas comunitárias do CRAS/CREAS.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'PLANO DE AÇÃO TERRITORIAL — CRAS', align: 'center', bold: true },
      { id: 'b2', type: 'heading2', text: '1. OBJETIVO GERAL', align: 'left', bold: true },
      { id: 'b3', type: 'paragraph', text: 'Fortalecer os vínculos familiares e comunitários dos moradores do Residencial [Nome], prevenindo situações de risco e promovendo o acesso aos serviços socioassistenciais.', align: 'justify' },
      { id: 'b4', type: 'heading2', text: '2. CRONOGRAMA DE ATIVIDADES', align: 'left', bold: true },
      { id: 'b5', type: 'numbered', text: 'Mês 1: Busca ativa territorial e mapeamento de famílias com pendências civis;', align: 'left' },
      { id: 'b6', type: 'numbered', text: 'Mês 2: Mutirão de emissão de certidões e atualização do CadÚnico;', align: 'left' },
      { id: 'b7', type: 'numbered', text: 'Mês 3: Rodas de conversa temáticas com mulheres e idosos.', align: 'left' },
      { id: 'b8', type: 'signature', text: 'Coordenação Técnica do CRAS', align: 'center' },
    ],
  },
  {
    id: 'solicitacao_documentos',
    title: 'Solicitação de Documentação Civil Básica',
    category: 'oficios',
    categoryLabel: 'Ofícios & Gestão',
    badge: 'Cidadania',
    description: 'Ofício de encaminhamento aos cartórios de registro civil com pedido de gratuidade de 2ª via certidões.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'SOLICITAÇÃO DE GRATUIDADE DE REGISTRO CIVIL', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'Ao(À) Ilustríssimo(a) Senhor(a) Oficial do Cartório do Registro Civil das Pessoas Naturais\nComarca de: [Município - UF]', align: 'left' },
      { id: 'b3', type: 'paragraph', text: 'Com base no art. 5º, inciso LXXVI da Constituição Federal e na Lei Federal nº 9.534/1997, SOLICITAMOS a emissão gratuita de 2ª via da Certidão de [Nascimento / Casamento / Óbito] em favor de:\n\nNome do Registrado: [Nome Completo]\nData do Registro: [DD/MM/AAAA] | Livro: [XXX] | Folha: [XXX] | Termo: [XXXXX]\nFiliação: [Nome da Mãe] e [Nome do Pai]', align: 'justify' },
      { id: 'b4', type: 'paragraph', text: 'Atestamos que o(a) requerente encontra-se em situação de vulnerabilidade e hipossuficiência socioeconômica assistida por este serviço público.', align: 'justify' },
      { id: 'b5', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
  {
    id: 'folha_timbrada_em_branco',
    title: 'Documento em Branco com Folha Timbrada',
    category: 'geral',
    categoryLabel: 'Geral',
    badge: 'Oficial',
    description: 'Página em branco formatada com cabeçalho institucional, rodapé com paginação e margens oficiais A4 prontas para digitação.',
    defaultSettings: { ...DEFAULT_LETTERHEAD_SETTINGS },
    defaultBlocks: [
      { id: 'b1', type: 'heading1', text: 'TÍTULO DO DOCUMENTO', align: 'center', bold: true },
      { id: 'b2', type: 'paragraph', text: 'Digite o conteúdo do seu documento oficial aqui...', align: 'justify' },
      { id: 'b3', type: 'signature', text: 'Assinatura Profissional', align: 'center' },
    ],
  },
]

/**
 * Converte milímetros para twips (1/20 de um ponto tipográfico; 1 mm = ~56.7 twips)
 */
export const SUAS_DOCUMENT_TEMPLATES = OFFICIAL_TEMPLATES;

function mmToTwip(mm: number): number {
  return Math.round(mm * 56.6929)
}

/**
 * Gera um arquivo binário DOCX real e válido utilizando a biblioteca docx
 */
export async function generateDocxBlob(doc: EditorDocument): Promise<Blob> {
  const settings = { ...DEFAULT_LETTERHEAD_SETTINGS, ...doc.settings }
  const fontFamily = settings.fontFamily || 'Calibri'
  const baseFontSizePt = settings.fontSize || 12
  const baseFontSizeHalfPoints = baseFontSizePt * 2 // docx usa meio-ponto (half-points)

  // 1. Cabeçalho Institucional (Folha Timbrada Oficial — Relatório de Visita / SUAS)
  const headerChildren: Paragraph[] = []
  if (settings.includeLetterhead) {
    if (settings.useOfficialLetterheadImage !== false) {
      try {
        const headerBytes = Uint8Array.from(atob(OFFICIAL_HEADER_BASE64), (c) => c.charCodeAt(0))
        headerChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new ImageRun({
                data: headerBytes,
                transformation: {
                  width: OFFICIAL_LETTERHEAD_CONFIG.header.docxWidth,
                  height: OFFICIAL_LETTERHEAD_CONFIG.header.docxHeight,
                },
                type: 'png',
              } as any),
            ],
          })
        )
      } catch (err) {
        console.warn('Erro ao carregar imagem oficial de cabeçalho:', err)
      }
    } else {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: settings.institutionName,
              bold: true,
              size: baseFontSizeHalfPoints + 2,
              font: fontFamily,
              color: '28232A',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: settings.institutionUnit,
              bold: true,
              size: baseFontSizeHalfPoints,
              font: fontFamily,
              color: 'F04491',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          border: {
            bottom: {
              color: 'F04491',
              space: 4,
              style: BorderStyle.SINGLE,
              size: 12,
            },
          },
          children: [
            new TextRun({
              text: `${settings.institutionAddress} • Tel: ${settings.institutionPhone} • ${settings.institutionEmail}`,
              size: baseFontSizeHalfPoints - 4,
              font: fontFamily,
              color: '827780',
            }),
          ],
        })
      )
    }
  }

  // 2. Rodapé Institucional com Folha Timbrada Oficial e Numeração de Página
  const footerChildren: Paragraph[] = []
  if (settings.includeLetterhead && settings.useOfficialLetterheadImage !== false) {
    try {
      const footerBytes = Uint8Array.from(atob(OFFICIAL_FOOTER_BASE64), (c) => c.charCodeAt(0))
      footerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 40 },
          children: [
            new ImageRun({
              data: footerBytes,
              transformation: {
                width: OFFICIAL_LETTERHEAD_CONFIG.footer.docxWidth,
                height: OFFICIAL_LETTERHEAD_CONFIG.footer.docxHeight,
              },
              type: 'png',
            } as any),
          ],
        })
      )
    } catch (err) {
      console.warn('Erro ao carregar imagem oficial de rodapé:', err)
    }
  }

  if (settings.includePageNumbers) {
    footerChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 40 },
        children: [
          new TextRun({
            text: 'AssistSocial — Gestão Socioassistencial | Página ',
            size: baseFontSizeHalfPoints - 5,
            font: fontFamily,
            color: '9CA3AF',
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: baseFontSizeHalfPoints - 5,
            font: fontFamily,
            color: '9CA3AF',
          }),
          new TextRun({
            text: ' de ',
            size: baseFontSizeHalfPoints - 5,
            font: fontFamily,
            color: '9CA3AF',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: baseFontSizeHalfPoints - 5,
            font: fontFamily,
            color: '9CA3AF',
          }),
        ],
      })
    )
  }

  // 3. Conversão dos Blocos do Editor para Parágrafos e Tabelas do DOCX
  const bodyElements: (Paragraph | Table)[] = []

  for (const block of doc.blocks) {
    let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT
    if (block.align === 'center') alignment = AlignmentType.CENTER
    if (block.align === 'right') alignment = AlignmentType.RIGHT
    if (block.align === 'justify') alignment = AlignmentType.JUSTIFIED

    if (block.type === 'heading1') {
      bodyElements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              size: baseFontSizeHalfPoints + 6,
              font: fontFamily,
              color: '28232A',
            }),
          ],
        })
      )
    } else if (block.type === 'heading2') {
      bodyElements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              size: baseFontSizeHalfPoints + 2,
              font: fontFamily,
              color: '28232A',
            }),
          ],
        })
      )
    } else if (block.type === 'heading3') {
      bodyElements.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          alignment,
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              size: baseFontSizeHalfPoints,
              font: fontFamily,
              color: '28232A',
            }),
          ],
        })
      )
    } else if (block.type === 'bullet') {
      bodyElements.push(
        new Paragraph({
          bullet: { level: 0 },
          alignment,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: block.text,
              size: baseFontSizeHalfPoints,
              font: fontFamily,
              color: '28232A',
              bold: block.bold,
              italics: block.italic,
            }),
          ],
        })
      )
    } else if (block.type === 'numbered') {
      bodyElements.push(
        new Paragraph({
          alignment,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: block.text,
              size: baseFontSizeHalfPoints,
              font: fontFamily,
              color: '28232A',
              bold: block.bold,
              italics: block.italic,
            }),
          ],
        })
      )
    } else if (block.type === 'table' && block.tableData && block.tableData.length > 0) {
      // Inserção de Tabela Formatada
      const rows = block.tableData.map((rowCells, rIdx) => {
        return new TableRow({
          children: rowCells.map((cellText) => {
            const isHeader = rIdx === 0
            return new TableCell({
              width: { size: 100 / (rowCells.length || 1), type: WidthType.PERCENTAGE },
              shading: isHeader ? { fill: 'FCE5ED' } : undefined,
              children: [
                new Paragraph({
                  alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: [
                    new TextRun({
                      text: cellText,
                      bold: isHeader,
                      size: baseFontSizeHalfPoints - 2,
                      font: fontFamily,
                    }),
                  ],
                }),
              ],
            })
          }),
        })
      })

      bodyElements.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      )
    } else if (block.type === 'signature') {
      // Bloco de Assinatura Oficial com Data/Local
      if (settings.cityDateLine) {
        bodyElements.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 360, after: 240 },
            children: [
              new TextRun({
                text: settings.cityDateLine,
                size: baseFontSizeHalfPoints,
                font: fontFamily,
              }),
            ],
          })
        )
      }

      bodyElements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 40 },
          children: [
            new TextRun({
              text: '________________________________________________',
              font: fontFamily,
              color: '827780',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: settings.signerName || 'Nome do(a) Profissional',
              bold: true,
              size: baseFontSizeHalfPoints,
              font: fontFamily,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `${settings.signerRole} ${settings.signerRegistration ? `• ${settings.signerRegistration}` : ''}`,
              size: baseFontSizeHalfPoints - 2,
              font: fontFamily,
              color: '4B5563',
            }),
          ],
        })
      )
    } else {
      // Parágrafo Normal
      bodyElements.push(
        new Paragraph({
          alignment,
          spacing: { before: 60, after: 120 },
          children: [
            new TextRun({
              text: block.text,
              size: baseFontSizeHalfPoints,
              font: fontFamily,
              color: '28232A',
              bold: block.bold,
              italics: block.italic,
              underline: block.underline ? {} : undefined,
            }),
          ],
        })
      )
    }
  }

  // 4. Instância do Documento DOCX
  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: mmToTwip(settings.margins.top),
              bottom: mmToTwip(settings.margins.bottom),
              left: mmToTwip(settings.margins.left),
              right: mmToTwip(settings.margins.right),
            },
            size: {
              orientation: settings.orientation === 'landscape' ? 'landscape' : 'portrait',
            },
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        footers: {
          default: new Footer({
            children: footerChildren,
          }),
        },
        children: bodyElements,
      },
    ],
  })

  // 5. Empacotamento em Blob
  const blob = await Packer.toBlob(wordDoc)
  return blob
}

/**
 * Dispara o download automático do arquivo .docx no navegador
 */
export async function downloadDocxFile(doc: EditorDocument, customFilename?: string): Promise<void> {
  const blob = await generateDocxBlob(doc)
  const cleanTitle = (customFilename || doc.title || 'documento')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')

  const filename = `${cleanTitle}.docx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const LOCAL_STORAGE_KEY = 'assistsocial_editor_docs'

function getLocalDocuments(): EditorDocument[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as EditorDocument[]
  } catch (err) {
    console.warn('Erro ao ler documentos locais:', err)
  }
  return []
}

function saveLocalDocument(doc: EditorDocument): void {
  try {
    const list = getLocalDocuments()
    const index = list.findIndex((d) => d.id === doc.id)
    if (index >= 0) {
      list[index] = doc
    } else {
      list.unshift(doc)
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  } catch (err) {
    console.warn('Erro ao salvar documento local:', err)
  }
}

/**
 * Busca documentos salvos do usuário (com fallback para armazenamento local)
 */
export async function fetchUserEditorDocuments(): Promise<EditorDocument[]> {
  try {
    const { data, error } = await (supabase.from('editor_documents') as any)
      .select('*')
      .order('updated_at', { ascending: false })

    if (!error && Array.isArray(data)) {
      return data.map((row) => ({
        id: row.id,
        owner_id: row.owner_id,
        title: row.title,
        category: row.category,
        template_id: row.template_id,
        blocks: row.content?.blocks || [],
        plain_text: row.plain_text,
        settings: row.settings || DEFAULT_LETTERHEAD_SETTINGS,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }))
    }
  } catch (err) {
    console.warn('Falha ao consultar documentos no Supabase, usando cache local:', err)
  }

  return getLocalDocuments()
}

/**
 * Salva rascunho de documento no backend (ou localmente se offline)
 */
export async function saveUserEditorDocument(
  doc: EditorDocument
): Promise<{ success: boolean; id?: string; message: string }> {
  const plainText = doc.blocks.map((b) => b.text).join('\n')
  const contentPayload = { blocks: doc.blocks }
  const now = new Date().toISOString()

  try {
    const { data: rpcData, error: rpcError } = await (supabase as any).rpc('save_editor_document', {
      p_id: doc.id || null,
      p_title: doc.title,
      p_category: doc.category || 'geral',
      p_template_id: doc.template_id || null,
      p_content: contentPayload,
      p_plain_text: plainText,
      p_settings: doc.settings,
    })

    if (!rpcError && rpcData?.id) {
      const savedDoc: EditorDocument = {
        ...doc,
        id: rpcData.id,
        updated_at: now,
      }
      saveLocalDocument(savedDoc)
      return { success: true, id: rpcData.id, message: 'Documento salvo com sucesso no banco de dados.' }
    }
  } catch (err) {
    console.warn('Erro na RPC save_editor_document, tentando gravação direta:', err)
  }

  // Fallback: tabela direta
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      if (doc.id) {
        const { error } = await (supabase.from('editor_documents') as any)
          .update({
            title: doc.title,
            category: doc.category,
            template_id: doc.template_id,
            content: contentPayload,
            plain_text: plainText,
            settings: doc.settings,
            updated_at: now,
          })
          .eq('id', doc.id)

        if (!error) {
          saveLocalDocument({ ...doc, updated_at: now })
          return { success: true, id: doc.id, message: 'Documento atualizado com sucesso.' }
        }
      } else {
        const { data, error } = await (supabase.from('editor_documents') as any)
          .insert({
            owner_id: user.id,
            title: doc.title,
            category: doc.category,
            template_id: doc.template_id,
            content: contentPayload,
            plain_text: plainText,
            settings: doc.settings,
          })
          .select('id')
          .single()

        if (!error && data?.id) {
          saveLocalDocument({ ...doc, id: data.id, updated_at: now })
          return { success: true, id: data.id, message: 'Documento criado com sucesso.' }
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao salvar no banco, gravando localmente:', err)
  }

  // Fallback offline
  const generatedId = doc.id || 'local_' + Date.now()
  saveLocalDocument({ ...doc, id: generatedId, updated_at: now })
  return { success: true, id: generatedId, message: 'Documento salvo localmente no dispositivo.' }
}

/**
 * Exclui documento do usuário
 */
export async function deleteUserEditorDocument(id: string): Promise<boolean> {
  try {
    await (supabase.from('editor_documents') as any).delete().eq('id', id)
  } catch (err) {
    console.warn('Falha ao excluir no banco de dados:', err)
  }

  try {
    const list = getLocalDocuments().filter((d) => d.id !== id)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

import { buildCompanyHeader, buildFooterWithSignature, tableLayout as commonTableLayout, infoTableLayout } from '@/utils/pdfHeader'
import { formatMoney, formatDateShort, numberToWords } from '@/utils/formatters'

/**
 * Geradores de documentos legais do crédito (pdfmake, frontend).
 * Extraídos de ContractDocumentsPage.vue (Contrato/Termo/Garantias) e do
 * CustomerDetailPage.vue antigo (Extracto do Crédito) para poderem ser
 * chamados a partir de qualquer página/aba sem duplicar templates.
 */

let pdfMakePromise = null
async function getPdfMake() {
  if (!pdfMakePromise) {
    pdfMakePromise = (async () => {
      const pdfMake = (await import('pdfmake/build/pdfmake')).default
      const pdfFonts = (await import('pdfmake/build/vfs_fonts')).default
      if (pdfMake.vfs === undefined) {
        pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts
      }
      return pdfMake
    })()
  }
  return pdfMakePromise
}

/** Logo da empresa em base64 (para injetar no header). */
export async function getCompanyLogoBase64(companyLogo) {
  const logo = companyLogo
  if (!logo || logo === '/logo.png') return null
  try {
    const token = localStorage.getItem('applicationMicroToken')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const url = logo.startsWith('http') ? logo : logo.startsWith('/') ? logo : `/documents/${logo}`
    const response = await fetch(url, { headers })
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('image/')) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Could not load logo:', e)
    return null
  }
}

function footerFor(company) {
  return function (currentPage, pageCount) {
    return {
      columns: [
        { text: 'Documento processado por computador', alignment: 'left', fontSize: 7, margin: [30, 0, 0, 0] },
        { text: `${company?.companyName || ''} | Pág. ${currentPage}/${pageCount}`, alignment: 'right', fontSize: 7, margin: [0, 0, 30, 0] }
      ]
    }
  }
}

function convertGender(customer) {
  const g = customer?.customerGender?.toLowerCase()
  if (g === 'f' || g === 'feminino') return 'A MUTUÁRIA'
  return 'O MUTUÁRIO'
}
function convertGenderLabel(customer) {
  const g = customer?.customerGender?.toLowerCase()
  if (g === 'f' || g === 'feminino') return 'Mulher'
  return 'Homem'
}

const tableLayout = {
  fillColor: (rowIndex) => (rowIndex === 0 ? '#f0f0f0' : null),
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#cccccc',
  vLineColor: () => '#cccccc'
}

// ============================================================
// 1. CONTRATO DE CONCESSÃO (20 cláusulas + vigésima primeira)
// ============================================================
export async function generateContratoConcessao({ company, customer, loan, guarantees = [], accounts = [], amortization = [], borrowerInfo = null }) {
  const pdfMake = await getPdfMake()
  const c = company || {}
  const cu = customer || {}
  const l = loan || {}
  const amount = parseFloat(l.amount) || 0
  const rate = (l.interestRate * 100).toFixed(1)
  const adminFeeRate = parseFloat(l.administrativeFee) || 0
  const preparationFee = Math.round(amount * adminFeeRate * 100) / 100
  const adminFeePct = (adminFeeRate * 100).toFixed(1)
  const companyName = c.companyName || 'Mais Mola'
  const companyAbbr = companyName.replace(/\s+/g, '').substring(0, 10).toUpperCase()
  const showInsuranceClause = Number(c.contractHideInsuranceClause || 0) !== 1

  const accountsRows = accounts.length > 0
    ? accounts.map((acc, idx) => [
        { text: `${idx + 1}`, fontSize: 7, alignment: 'center' },
        { text: acc.accountDescription || '--', fontSize: 7 },
        { text: acc.accountHolder || '--', fontSize: 7 },
        { text: acc.accountNumber || '--', fontSize: 7, alignment: 'center', bold: true }
      ])
    : []

  const guaranteesList = guarantees.length > 0
    ? guarantees.map(g => ({ text: g.guaranteeDescription || g.description || 'Sem descrição', fontSize: 8 }))
    : [{ text: '(Sem garantias registadas)', fontSize: 8, italics: true, color: '#999999' }]

  const logoBase64 = await getCompanyLogoBase64(c.companyLogo)
  const headerElements = buildCompanyHeader(c, logoBase64, 'Contrato de Concessão de Empréstimo')

  // Plano de pagamento (idêntico ao contrato original)
  const plan = amortization || []
  let planTables = []
  if (plan.length > 0) {
    const totalInterest = plan.reduce((sum, r) => sum + (parseFloat(r.rateAmount) || 0), 0)
    const totalAmortization = plan.reduce((sum, r) => sum + (parseFloat(r.amortization) || 0), 0)
    const totalInstallment = plan.reduce((sum, r) => sum + (parseFloat(r.installment) || 0), 0)
    let saldo = amount
    planTables = [
      {
        table: {
          widths: ['*', '*', '*', '*', '*'],
          body: [
            ['Capital Financiado', 'Taxa de Juro', 'Nº Prestações', 'Total de Juros', 'Total a Pagar'].map(t => ({ text: t, fontSize: 8, bold: true, alignment: 'center', fillColor: '#e8eaf6' })),
            [
              { text: formatMoney(amount), fontSize: 10, bold: true, alignment: 'center' },
              { text: `${rate}%`, fontSize: 10, bold: true, alignment: 'center' },
              { text: `${l.numberOfInstallments}`, fontSize: 10, bold: true, alignment: 'center' },
              { text: formatMoney(totalInterest), fontSize: 10, bold: true, alignment: 'center' },
              { text: formatMoney(totalInstallment), fontSize: 10, bold: true, alignment: 'center', color: '#1565c0' }
            ]
          ]
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0' },
        margin: [0, 0, 0, 8]
      },
      {
        table: {
          widths: ['auto', '*', '*', '*', '*', 'auto'],
          body: [
            ['Ordem', 'Amortização', 'Juros', 'Prestação', 'Saldo', 'Vencimento'].map(t => ({ text: t, style: 'columnsTitle', alignment: t === 'Ordem' || t === 'Vencimento' ? 'center' : 'right' })),
            ...plan.map((a, idx) => {
              const amort = parseFloat(a.amortization) || 0
              const apiBalance = a.remainingBalance !== undefined && a.remainingBalance !== null ? parseFloat(a.remainingBalance) : null
              saldo = apiBalance !== null ? apiBalance : Math.max(0, saldo - amort)
              if (idx === plan.length - 1) saldo = 0
              return [
                { text: `${idx + 1}ª`, fontSize: 7, alignment: 'center' },
                { text: formatMoney(amort), fontSize: 7, alignment: 'right' },
                { text: formatMoney(a.rateAmount || 0), fontSize: 7, alignment: 'right' },
                { text: formatMoney(a.installment || 0), fontSize: 7, alignment: 'right', bold: true },
                { text: formatMoney(saldo), fontSize: 7, alignment: 'right', color: saldo > 0 ? '#333' : '#2e7d32' },
                { text: formatDateShort(a.dueDate), fontSize: 7, alignment: 'center' }
              ]
            }),
            [
              { text: 'Total', fontSize: 7, bold: true, alignment: 'center' },
              { text: formatMoney(totalAmortization), fontSize: 7, alignment: 'right', bold: true },
              { text: formatMoney(totalInterest), fontSize: 7, alignment: 'right', bold: true },
              { text: formatMoney(totalInstallment), fontSize: 7, alignment: 'right', bold: true },
              { text: '0,00 MZN', fontSize: 7, alignment: 'right', bold: true, color: '#2e7d32' },
              { text: '', fontSize: 7 }
            ]
          ]
        },
        layout: commonTableLayout,
        margin: [0, 0, 0, 8]
      }
    ]
  }

  // Borrower info table
  const installments = plan
  const firstInstallment = installments[0] || {}
  const lastInstallment = installments[installments.length - 1] || {}
  const installValue = firstInstallment.installment || 0
  const lastDue = lastInstallment.dueDate ? formatDateShort(lastInstallment.dueDate) : '-'

  const docDefinition = {
    footer: footerFor(c),
    content: [
      ...headerElements,
      { text: '\nEntre:\n\n', fontSize: 8, bold: true },
      { text: { alignment: 'justify', fontSize: 8, text: `${companyName}, uma instituição financeira licenciada pelo Banco de Moçambique, titular do NUIT ${c.companyNuit || ''}, com sede em ${c.companyAddress || ''}, doravante designada por Mutuante ou Credora` } },
      { text: '\n&\n\n', fontSize: 8 },
      { text: { alignment: 'justify', fontSize: 8, text: String(cu.customerType || 'PF') === 'PJ'
        ? `${cu.customerName || ''}, titular do NUIT ${cu.customerNuit || ''}, com sede em ${cu.customerAddress || ''}, titular do Alvará nº ${cu.companyLicenseNumber || ''}, que exerce actividade de ${cu.companyMainActivity || ''}, neste acto representada pelo seu representante legal ${cu.companyLegalRepresentative || ''}, portador do BI nº ${cu.companyRepresentativeIdNumber || ''}, de ora em diante designada O MUTUÁRIO.`
        : `${cu.customerName || ''}, portador do B.I número ${cu.customerNationalId || ''}, residente no ${cu.customerAddress || ''}, de ora em diante denominado ${convertGender(cu)}.`
      } },
      // ── CLÁUSULAS 1-20 + Vigésima primeira (igual ao original) ──
      clause('PRIMEIRA', '(Objecto, Montante e Forma de Desenvolvimento do Capital)', [
        numbered('O presente contrato tem por objecto, regular a concessão de um empréstimo, em forma de mútuo que o Mutuante disponibiliza ao Mutuário e, este último confessa-se para todos os efeitos legais, devedor do Mutuante, no montante de capital de ', `${formatMoney(amount)} (${numberToWords(amount)} meticais)`, ', acrescidos de juros acordados de ', `${rate}%`, ', irão vencendo nos termos e condições indicados nas cláusulas que se seguem.')
      ]),
      clause('SEGUNDA', '(Forma de Desembolso e Entrada em Vigor do Contrato)', [
        numbered('O valor do empréstimo foi entregue ao Mutuário, através do desembolso directo na conta do Mutuário.'),
        numbered('O presente contrato entra imediatamente em vigor na data da sua assinatura.')
      ]),
      clause('TERCEIRA', '(Prazo)', [
        numbered(`O presente contrato é celebrado por um período de ${l.numberOfInstallments} ${l.numberOfInstallments == 1 ? 'mês' : 'meses'}, contados a partir da data da disponibilização do capital mutuado.`)
      ]),
      clause('QUARTA', '(Taxas de Juros e Plano de Pagamento)', [
        numbered(`O montante desembolsado e que constitui a dívida confessada, no presente contrato, vence juros remuneratórios de ${rate}%, sendo estes calculados mensalmente sobre o capital em dívida e pagáveis conjuntamente com o reembolso do capital.`),
        numbered('O reembolso do capital e juros será efectuado de acordo com o plano de amortização constante do presente contrato, conforme tabela abaixo:')
      ]),
      { text: '\nPlano de Pagamento das Prestações', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 6] },
      ...planTables,
      clause('QUINTA', '(Reembolso e Local)', [
        plainText('As rendas mensais de capital e juros a amortizar serão pagas pelo Mutuário ao Mutuante, através de crédito a efectuar nas seguintes contas:')
      ]),
      ...(accountsRows.length > 0
        ? [{ table: { widths: ['auto', '*', '*', 'auto'], body: [['#', 'Banco', 'Titular', 'Nº Conta'].map(t => ({ text: t, style: 'columnsTitle', alignment: t === '#' || t === 'Nº Conta' ? 'center' : 'left' })), ...accountsRows] }, layout: tableLayout, margin: [0, 6, 0, 0] }]
        : [{ text: '(Sem contas registadas)', fontSize: 8, italics: true, color: '#999999', margin: [0, 4, 0, 0] }]),
      clause('SEXTA', '(Prova de Reembolso)', [plainText('O talão de depósito ou nota de transferência bancária servem como prova de reembolso da prestação devida.')]),
      clause('SÉTIMA', '(Comissão de Preparos)', [
        numbered('Pela operação o Mutuário ', adminFeeRate > 0 ? `paga uma taxa de preparos de ${formatMoney(preparationFee)} (${numberToWords(preparationFee)} meticais), correspondentes a ${adminFeePct}% sobre o capital do empréstimo, sendo estes liquidados de uma só vez na data do desembolso do capital.` : 'está isento do pagamento da taxa de preparos administrativos.')
      ]),
      clause('OITAVA', '(Mora e Incumprimento)', [
        numbered(`A mora pela amortização de qualquer prestação vencida implica a aplicação de juros moratórios de ${c.forfeit || 0.1}% por dia, a calcular sobre o capital e juros das prestações vencidas.`)
      ]),
      clause('NONA', '(Garantias do Empréstimo)', [
        plainText('Para este empréstimo, o Mutuário apresenta como garantias:'),
        { ul: guaranteesList, margin: [10, 4, 0, 0] }
      ]),
      clause('DÉCIMA', '(Futuro Uso das Garantias)', [plainText('As garantias descritas na cláusula nona poderão ser usadas em futuros créditos, mediante solicitação de novo empréstimo.')]),
      clause('DÉCIMA PRIMEIRA', '(Pari Passu)', [plainText('Caso venha a ocorrer uma situação em que o Mutuário não possa cumprir pontualmente e integralmente com todas as suas obrigações, o Mutuante concorre em igualdade de circunstância com os restantes credores.')]),
      clause('DÉCIMA SEGUNDA', '(Entrega Voluntária dos Bens)', [numbered('Em caso de incumprimento do presente pelo Mutuário, o Mutuante reserva-se ao direito de se fazer pelas garantias assumidas sem recurso aos tribunais.')]),
      clause('DÉCIMA TERCEIRA', '(Execução das Garantias)', [numbered('O bem poderá ser executado logo que vencida qualquer uma das prestações e que o Mutuário tenha efectuado a sua completa e integral liquidação.')]),
      clause('DÉCIMA QUARTA', '(Exigibilidade do Crédito)', [numbered('O Crédito objecto do presente contrato considera-se vencido e automaticamente todo o capital e juros em dívida nos seguintes casos: falta de pagamento de uma ou mais prestações vencidas, aplicação para fins diferentes daqueles pelos quais o financiamento foi destinado.')]),
      clause('DÉCIMA QUINTA', '(Endereços)', [plainText('Todas as comunicações entre o Mutuante e o Mutuário deverão ser efectuadas por escrito, e dirigidas para os endereços constantes no Contrato.')]),
      clause('DÉCIMA SEXTA', '(Despesas)', [numbered('Todas as despesas inerentes à execução do presente contrato, incluindo o valor de impostos de selo, correm por conta e responsabilidade do Mutuário.')]),
      clause('DÉCIMA SÉTIMA', '(Liquidação Antecipada)', [numbered('Em caso de reembolso antecipado da totalidade ou da parte do capital em dívida, o mesmo deverá ser efectuado nas datas do vencimento das prestações.')]),
      clause('DÉCIMA OITAVA', '(Acordo)', [plainText('O presente contrato vai ser assinado em duplicado, ficando uma à disposição do Mutuante e outra do Mutuário.')]),
      clause('DÉCIMA NONA', '(Foro)', [plainText('Em caso de litígio o foro competente é o Tribunal Judicial da Cidade de Maputo, com expressa renúncia a qualquer outro.')]),
      clause('VIGÉSIMA', '(Disposições Finais)', [plainText('O presente contrato é regido pela legislação moçambicana em vigor.')]),
      // Vigésima primeira (seguro) — ocultável
      ...(showInsuranceClause ? buildInsuranceClause({ companyName, companyAbbr, cu, borrowerInfo, installments, amount, rate, l }) : []),
      { text: '\n\n\n' },
      { text: `Maputo, aos ${formatDateShort(l.updatedAt || l.dateCreated)}`, bold: false, fontSize: 8, alignment: 'center' },
      { text: '\n\n\n' },
      {
        alignment: 'center', fontSize: 8,
        columns: [
          { text: `__________________________\n\n${c.companyManager || 'Gestor de Crédito'}\n\n(O MUTUANTE)`, alignment: 'center' },
          {},
          String(cu.customerType || 'PF') === 'PJ'
            ? { text: `__________________________\n\nPela MUTUÁRIA\n${cu.customerName || ''}\nRepresentada por: ${cu.companyLegalRepresentative || ''}\nBI: ${cu.companyRepresentativeIdNumber || ''}`, alignment: 'center' }
            : { text: `__________________________\n\n${cu.customerName || ''}\n\n(${convertGender(cu).trim()})`, alignment: 'center' }
        ]
      }
    ],
    styles: { columnsTitle: { fontSize: 8, bold: true, color: '#000000' } }
  }

  pdfMake.createPdf(docDefinition).open()
}

function clause(name, subtitle, content) {
  return [
    { text: `\nCLÁUSULA ${name}`, fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
    { text: subtitle, fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
    ...content
  ]
}
function numbered(...parts) {
  return [{ text: '1. ', bold: true }, ...parts.map(p => (typeof p === 'string' ? { text: p } : p))].map(x => ({ ...x, fontSize: 8 }))
}
function plainText(text) {
  return { text, fontSize: 8, alignment: 'justify' }
}

function buildInsuranceClause({ companyName, companyAbbr, cu, borrowerInfo, installments, amount, rate, l }) {
  const firstInstallment = installments[0] || {}
  const lastInstallment = installments[installments.length - 1] || {}
  const installValue = firstInstallment.installment || 0
  const lastDue = lastInstallment.dueDate ? formatDateShort(lastInstallment.dueDate) : '-'
  const bi = borrowerInfo || {}
  return [
    { text: '\nCLÁUSULA VIGÉSIMA PRIMEIRA', fontSize: 10, bold: true, alignment: 'center', margin: [0, 10, 0, 0] },
    { text: '(Protecção do Empréstimo, Seguro, Garantias e Recuperação do Crédito)', fontSize: 9, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
    insPoint('1. Finalidade do Empréstimo', '1.1.', `O crédito concedido ao MUTUÁRIO integra o montante global do valor disponibilizado, destinado ao financiamento das actividades de geração de renda, dos beneficiários elegíveis definidos, celebrado entre a KMAD e a ${companyName} (${companyAbbr}).`),
    insPoint('1.2. ', 'O MUTUÁRIO reconhece que os recursos recebidos constituem capital destinado à concessão de crédito e que a sua utilização, reembolso e recuperação deverão observar as condições estabelecidas no presente contrato.'),
    insPoint('2. Obrigatoriedade do seguro antes do desembolso', '2.1.', 'A contratação e activação do seguro obrigatório constituem condição suspensiva para o desembolso do crédito.'),
    insPoint('2.2.', `A ${companyName} não efectuará qualquer desembolso ao MUTUÁRIO enquanto não estiver comprovada a existência de uma apólice de seguro válida e activa, emitida por uma seguradora legalmente autorizada a operar na República de Moçambique.`),
    insPoint('2.3.', 'O seguro deverá abranger, conforme disponibilidade e condições da seguradora:'),
    insList(['a) Morte do MUTUÁRIO;', 'b) Invalidez permanente total;', 'c) Incapacidade temporária para o trabalho;', 'd) Desemprego involuntário, quando aplicável; e', 'e) Outras coberturas consideradas necessárias para a protecção do crédito.']),
    insPoint('2.4.', `A ${companyName} deverá ser indicada como beneficiária preferencial da indemnização até ao limite do saldo devedor, relativamente às coberturas directamente relacionadas com o crédito.`),
    insPoint('3. Protecção do capital', '3.1.', 'O MUTUÁRIO reconhece que a preservação do capital constitui condição essencial do financiamento.'),
    insPoint('3.2.', `O MUTUÁRIO obriga-se a utilizar os recursos exclusivamente para a finalidade aprovada pela ${companyName} e definida no respectivo processo de crédito.`),
    insPoint('3.3.', `É expressamente proibida a utilização do financiamento para fins diferentes dos aprovados, salvo autorização prévia e escrita da ${companyName}.`),
    insPoint('3.4.', `O incumprimento das obrigações de utilização, conservação ou reembolso do capital poderá determinar a exigência do reembolso antecipado do saldo devedor, sem prejuízo de outros direitos previstos no contrato e na legislação aplicável.`),
    insPoint('4. Garantias do crédito', '4.1.', `Como condição para a concessão do financiamento, o MUTUÁRIO deverá prestar as garantias exigidas pela ${companyName}, adequadas ao montante, prazo, finalidade e perfil de risco do crédito.`),
    insPoint('4.2.', 'As garantias poderão incluir, conforme aplicável:'),
    insList(['a) Garantia pessoal/fiança;', 'b) Aval;', 'c) Penhor de bens móveis, equipamentos, mercadorias ou outros activos;', 'd) Hipoteca ou outra garantia real legalmente admissível;', 'e) Cessão de créditos ou de receitas provenientes de contratos; e', `f) Outras garantias aceites pela ${companyName}.`]),
    insPoint('4.3.', `A existência de seguro não elimina nem substitui as garantias exigidas pela ${companyName}, salvo decisão expressa da ${companyName} em sentido contrário.`),
    insPoint('4.4.', 'Sempre que o financiamento seja garantido por um bem susceptível de seguro, o MUTUÁRIO deverá manter o referido bem devidamente seguro durante toda a vigência do crédito.'),
    insPoint('5. Seguro dos bens dados em garantia', '5.1.', 'Os bens dados em garantia deverão, sempre que a sua natureza o permita, estar cobertos por seguro adequado contra os principais riscos associados ao activo.'),
    insPoint('5.2.', `A ${companyName} deverá ser indicada como beneficiária preferencial da indemnização até ao limite do saldo devedor, sempre que legalmente admissível.`),
    insPoint('5.3.', 'Em caso de destruição, perda ou dano do bem dado em garantia, a indemnização do seguro deverá ser utilizada, conforme aplicável, para:'),
    insList(['a) reposição ou reparação do bem; ou', `b) amortização ou liquidação do saldo devedor perante a ${companyName}.`]),
    insPoint('6. Morte ou invalidez permanente do mutuário', '6.1.', `Em caso de morte ou invalidez permanente total do MUTUÁRIO decorrente de evento coberto pela apólice, a ${companyName} comunicará o sinistro à seguradora e adoptará as medidas necessárias para acionar a cobertura.`),
    insPoint('6.2.', `O valor da indemnização será aplicado prioritariamente na liquidação do saldo devedor do MUTUÁRIO perante a ${companyName}, até ao limite do capital seguro.`),
    insPoint('6.3.', 'Caso a indemnização seja superior ao saldo devedor, o remanescente será destinado ao beneficiário legalmente competente, nos termos da apólice e da legislação aplicável.'),
    insPoint('6.4.', 'Caso a indemnização seja inferior ao saldo devedor ou o sinistro seja recusado pela seguradora por motivo previsto na apólice, o saldo não coberto continuará a ser devido pelo MUTUÁRIO ou pelos responsáveis legalmente obrigados.'),
    insPoint('7. Incapacidade temporária', '7.1.', 'Quando esta cobertura estiver expressamente contratada, a incapacidade temporária poderá permitir o pagamento das prestações do crédito pela seguradora durante o período previsto na apólice.'),
    insPoint('7.2.', `A incapacidade temporária não implica automaticamente a suspensão das obrigações do MUTUÁRIO perante a ${companyName}, salvo quando o pagamento pela seguradora estiver confirmado e abranger a respectiva prestação.`),
    insPoint('8. Desemprego involuntário', '8.1.', 'Quando contratada esta cobertura, o desemprego involuntário do MUTUÁRIO poderá dar lugar ao pagamento das prestações do crédito pela seguradora, dentro dos limites, períodos de carência e condições estabelecidas na apólice.'),
    insPoint('8.2.', 'O desemprego voluntário, abandono do emprego, despedimento por justa causa ou outras situações expressamente excluídas pela apólice não serão considerados eventos cobertos.'),
    insPoint('9. Incumprimento e recuperação do crédito', '9.1.', 'O não pagamento de qualquer prestação na data de vencimento constituirá incumprimento nos termos definidos no contrato de crédito.'),
    insPoint('9.2.', `Verificado o incumprimento, a ${companyName} poderá adoptar medidas de recuperação, incluindo:`),
    insList(['a) Contacto e notificação do MUTUÁRIO;', 'b) Plano de regularização ou reestruturação, quando justificável;', 'c) Acionamento das garantias constituídas;', 'd) Acionamento do seguro, quando o incumprimento resultar de evento coberto;', 'e) Execução das garantias legalmente admissíveis; e', 'f) Recurso às demais vias extrajudiciais ou judiciais disponíveis.']),
    insPoint('9.3.', `A ${companyName} deverá procurar recuperar o crédito de forma proporcional e adequada, tendo em consideração a preservação do Capital e os direitos do MUTUÁRIO.`),
    insPoint('10. Obrigação de comunicação de alterações', '10.1.', `O MUTUÁRIO obriga-se a comunicar imediatamente à ${companyName}, qualquer alteração relevante que possa afectar a sua capacidade de pagamento, incluindo perda de emprego, incapacidade para trabalhar, redução significativa dos rendimentos, perda ou deterioração dos bens dados em garantia, ou qualquer outro facto relevante para o cumprimento do contrato.`),
    insPoint('10.2.', 'O MUTUÁRIO deverá igualmente comunicar qualquer alteração, cancelamento, suspensão ou não renovação da apólice de seguro.'),
    insPoint('11. Manutenção das garantias e seguros', '11.1.', `Durante toda a vigência do crédito, o MUTUÁRIO deverá assegurar a manutenção das garantias e seguros exigidos pela ${companyName}.`),
    insPoint('11.2.', `A ${companyName} poderá solicitar, a qualquer momento, comprovativos da validade das garantias e das apólices de seguro.`),
    insPoint('11.3.', 'A falta de manutenção das garantias ou do seguro obrigatório poderá constituir incumprimento contratual, e dar lugar às medidas previstas no presente contrato.'),
    insPoint('12. Proibição de levantamento ou transferência de garantias', '12.1.', `Sem autorização prévia e escrita da ${companyName}, o MUTUÁRIO não poderá vender, transferir, alienar, onerar, dar novamente em garantia ou praticar qualquer acto que possa reduzir o valor dos bens dados em garantia.`),
    insPoint('12.2.', 'Qualquer violação desta obrigação poderá determinar o vencimento antecipado do crédito, nos termos do presente contrato e da legislação aplicável.'),
    insPoint('13. Vencimento antecipado', '13.1.', `Sem prejuízo das disposições legais aplicáveis, a ${companyName} poderá declarar antecipadamente vencido o crédito quando se verifique, designadamente:`),
    insList(['a) Utilização indevida dos fundos;', 'b) Prestação de informações falsas ou materialmente incorrectas;', 'c) Incumprimento reiterado das prestações;', 'd) Cancelamento ou inexistência do seguro obrigatório;', 'e) Deterioração ou desaparecimento das garantias sem reposição adequada;', 'f) Alienação não autorizada de bens dados em garantia; ou', 'g) Ocorrência de qualquer outro facto grave que comprometa significativamente a recuperação do crédito.']),
    insPoint('13.2.', 'Declarado o vencimento antecipado, o MUTUÁRIO deverá proceder ao pagamento integral do saldo devedor, acrescido dos encargos contratualmente devidos e legalmente admissíveis.'),
    insPoint('14. Aplicação dos valores recuperados', '14.1.', `Os valores recebidos pela ${companyName} provenientes de pagamentos do MUTUÁRIO, indemnizações de seguros, execução de garantias ou outras formas de recuperação serão aplicados na regularização das obrigações do crédito, observando a ordem de imputação prevista no contrato e na legislação aplicável.`),
    insPoint('14.2.', `A ${companyName} manterá registos adequados dos valores desembolsados, recebidos, recuperados e eventualmente indemnizados pela seguradora, de modo a permitir o acompanhamento da utilização e recuperação do capital.`),
    insPoint('15. Responsabilidade pela sustentabilidade do Fundo', '15.1.', 'O MUTUÁRIO reconhece que o cumprimento pontual das suas obrigações contribui directamente para a preservação e continuidade do Fundo KMAD.'),
    insPoint('15.2.', `O MUTUÁRIO compromete-se, por isso, a cumprir rigorosamente as condições do financiamento, permitindo que os valores recuperados possam, nos termos do contrato com a ${companyName} e das regras aplicáveis ao uso do capital, continuar a beneficiar outros membros elegíveis da comunidade.`),
    insPoint('15.3.', `A presente cláusula não prejudica os direitos da ${companyName} decorrentes dos Contratos celebrados com os clientes, nem limita as obrigações da ${companyName} perante os seus clientes relativamente à administração, controlo, pagamento das prestações e preservação dos recursos disponibilizados.`),
    // Tabela de informação do mutuário
    { text: '\nTabela de Prestação de Informação do Mutuário', fontSize: 10, bold: true, alignment: 'center', margin: [0, 15, 0, 8] },
    {
      table: {
        widths: ['*', '*'],
        body: [
          ['Item', 'Informação'].map(t => ({ text: t, style: 'columnsTitle', bold: true })),
          [{ text: 'Mutuário', fontSize: 8 }, { text: cu.customerName || '-', fontSize: 8 }],
          [{ text: 'Valor do crédito', fontSize: 8 }, { text: formatMoney(amount), fontSize: 8 }],
          [{ text: 'Prazo', fontSize: 8 }, { text: `${l.numberOfInstallments} meses`, fontSize: 8 }],
          [{ text: 'Taxa', fontSize: 8 }, { text: `${rate}% ao mês`, fontSize: 8 }],
          [{ text: 'Finalidade', fontSize: 8 }, { text: bi.finalidade || '-', fontSize: 8 }],
          [{ text: 'Garantia', fontSize: 8 }, { text: bi.garantia || '-', fontSize: 8 }],
          [{ text: 'Seguro de vida/crédito', fontSize: 8 }, { text: bi.seguroVida || 'Não', fontSize: 8 }],
          [{ text: 'Capital seguro', fontSize: 8 }, { text: bi.capitalSeguro || formatMoney(amount), fontSize: 8 }],
          [{ text: 'Seguro do bem', fontSize: 8 }, { text: bi.seguroBem || 'Não', fontSize: 8 }],
          [{ text: 'Beneficiário', fontSize: 8 }, { text: bi.beneficiario || `${companyName} até ao saldo devedor`, fontSize: 8 }],
          [{ text: 'Prestação mensal', fontSize: 8 }, { text: formatMoney(installValue), fontSize: 8 }],
          [{ text: 'Data do desembolso', fontSize: 8 }, { text: formatDateShort(l.dateCreated), fontSize: 8 }],
          [{ text: 'Data do vencimento', fontSize: 8 }, { text: lastDue, fontSize: 8 }]
        ]
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0' },
      margin: [0, 0, 0, 15]
    }
  ]
}

function insPoint(a, b, c) {
  // 2 args → parágrafo numerado: insPoint('1.2. ', 'texto...')
  // 3 args → título bold + parágrafo numerado: insPoint('2. Título', '2.1. ', 'texto...')
  if (c === undefined) {
    return { text: [{ text: String(a).trim() + ' ', bold: true }, { text: b }], fontSize: 8, alignment: 'justify' }
  }
  return [
    { text: [{ text: a, bold: true }], fontSize: 8, margin: [0, 6, 0, 2] },
    { text: [{ text: String(b).trim() + ' ', bold: true }, { text: c }], fontSize: 8, alignment: 'justify' }
  ]
}
function insList(items) {
  return items.map(t => ({ text: `      ${t}`, fontSize: 8, margin: [10, 2, 0, 0] }))
}

// ============================================================
// 2. TERMO DE COMPROMISSO
// ============================================================
export async function generateTermoCompromisso({ company, customer, loan }) {
  const pdfMake = await getPdfMake()
  const c = company || {}
  const cu = customer || {}
  const l = loan || {}
  const amount = parseFloat(l.amount) || 0
  const logoBase64 = await getCompanyLogoBase64(c.companyLogo)
  const headerElements = buildCompanyHeader(c, logoBase64, 'Termo de Compromisso de Recebimento de Crédito')

  const docDefinition = {
    footer: footerFor(c),
    content: [
      ...headerElements,
      String(cu.customerType || 'PF') === 'PJ'
        ? {
            text: [
              { text: 'Pelo presente, nós ' },
              { text: cu.customerName || '', bold: true, decoration: 'underline' },
              { text: ', NUIT ' },
              { text: cu.customerNuit || '', bold: true },
              { text: ', representada por ' },
              { text: cu.companyLegalRepresentative || '', bold: true },
              { text: ', com BI nº ' },
              { text: cu.companyRepresentativeIdNumber || '', bold: true },
              { text: ', declaramos que recebemos na data de hoje o valor de ' },
              { text: `${formatMoney(amount)} (${numberToWords(amount)} meticais)`, bold: true },
              { text: ' da MBR Microcrédito.' }
            ],
            fontSize: 10, alignment: 'justify', lineHeight: 1.6
          }
        : {
            text: [
              { text: 'Pelo presente, eu ' },
              { text: cu.customerName || '', bold: true, decoration: 'underline' },
              { text: '\nCidadão(a) moçambicano(a) com o nº do BI ' },
              { text: cu.customerNationalId || '', bold: true },
              { text: ', ' },
              { text: 'declaro que recebi', bold: true },
              { text: ' na data de hoje, o valor de ' },
              { text: `${formatMoney(amount)} (${numberToWords(amount)} meticais)`, bold: true },
              { text: ', em:' }
            ],
            fontSize: 10, alignment: 'justify', lineHeight: 1.6
          },
      { text: ' ' },
      { text: [{ text: 'Cheque (________)    Numerário (________)    Transferência (________)', fontSize: 10 }], alignment: 'left', margin: [0, 0, 0, 6] },
      { text: [{ text: ' da ' }, { text: c.companyName || 'Mais Mola', bold: true }, { text: '.' }], fontSize: 10, alignment: 'justify' },
      { text: '\n\n' },
      { text: 'Sendo expressão da verdade e sem qualquer coação, firmo presente.', fontSize: 10, alignment: 'justify' },
      { text: '\n\n' },
      { text: `Mukhatine, ${formatDateShort(l.updatedAt || l.dateCreated)}`, fontSize: 10, alignment: 'center' },
      { text: '\n\n\n\n' },
      { text: '……………………………………………………………………………………', fontSize: 10, alignment: 'center' },
      String(cu.customerType || 'PF') === 'PJ'
        ? [
            { text: `${cu.customerName || ''}`, fontSize: 9, alignment: 'center', bold: true },
            { text: `Representada por: ${cu.companyLegalRepresentative || ''}`, fontSize: 8, alignment: 'center' }
          ]
        : { text: `(${cu.customerName || ''})`, fontSize: 9, alignment: 'center', bold: true }
    ]
  }

  pdfMake.createPdf(docDefinition).open()
}

// ============================================================
// 3. DECLARAÇÃO DE GARANTIAS
// ============================================================
export async function generateDeclaracaoGarantias({ company, customer, loan, guarantees = [] }) {
  const pdfMake = await getPdfMake()
  const c = company || {}
  const cu = customer || {}
  const l = loan || {}
  const logoBase64 = await getCompanyLogoBase64(c.companyLogo)
  const headerElements = buildCompanyHeader(c, logoBase64, 'Declaração de Garantias')

  const guarRows = guarantees.map((g, idx) => [
    { text: `${idx + 1}`, fontSize: 8, alignment: 'center' },
    { text: g.guaranteeDescription || g.description || '--', fontSize: 8 },
    { text: formatDateShort(g.createdAt || g.dateCreated), fontSize: 8 },
    { text: formatMoney(g.purchaseAmount || g.purchaseValue || 0), fontSize: 8, alignment: 'right' }
  ])
  const totalGuaranteeAmount = guarantees.reduce((sum, g) => sum + parseFloat(g.purchaseAmount || g.purchaseValue || 0), 0)

  const docDefinition = {
    footer: footerFor(c),
    content: [
      ...headerElements,
      { text: '\n' },
      { text: '1. Dados cliente', fontSize: 9, bold: true },
      { text: '\n' },
      String(cu.customerType || 'PF') === 'PJ'
        ? [
            { text: `EMPRESA: ${(cu.customerName || '').toUpperCase()}`, fontSize: 8, bold: true },
            { text: `NUIT: ${cu.customerNuit || ''}`, fontSize: 8 },
            { text: `Alvará: ${cu.companyLicenseNumber || ''} | Actividade: ${cu.companyMainActivity || ''}`, fontSize: 8 },
            { text: `Representante: ${cu.companyLegalRepresentative || ''}`, fontSize: 8 },
            { text: `Sede: ${cu.customerAddress || ''} | Tel: ${cu.customerPhone || ''}`, fontSize: 8 }
          ]
        : [
            { text: `${convertGenderLabel(cu).toUpperCase()}: ${(cu.customerName || '').toUpperCase()}`, fontSize: 8, bold: true },
            { text: `Nº do cliente: ${cu.accountNumber || ''}`, fontSize: 8 },
            { text: `Morada: ${cu.customerAddress || ''}`, fontSize: 8 },
            { text: `Telemóvel: +${cu.customerPhone || ''}`, fontSize: 8 },
            { text: `NUIT: ${cu.customerNuit || ''}`, fontSize: 8 }
          ],
      { text: '\n' },
      { text: '2. Bens de garantia', fontSize: 9, bold: true },
      {
        table: {
          widths: ['auto', '*', '*', 'auto'],
          body: [
            ['#', 'Descrição', 'Data de submissão', 'Avaliação (MZN)'].map(t => ({ text: t, style: 'columnsTitle' })),
            ...guarRows
          ]
        },
        layout: 'lightHorizontalLines'
      },
      { text: '\n\n' },
      { text: `Valor total dos bens para garantia ${formatMoney(totalGuaranteeAmount)} (${numberToWords(totalGuaranteeAmount)} meticais)`, fontSize: 9, bold: true },
      { text: '\n' },
      { text: `E por ser verdade, certifico que todas as informações por mim prestadas ao Gestor de Crédito, bem como os bens acima descritos, servem de garantia para a satisfação da obrigação prevista no contrato de concessão de empréstimo celebrado com a ${c.companyName || ''}`, fontSize: 9 },
      { text: '\n\n\n' },
      { text: `Maputo, aos ${formatDateShort(l.updatedAt || l.dateCreated)}`, bold: false, fontSize: 8, alignment: 'center' },
      { text: '\n\n\n' },
      {
        alignment: 'center', fontSize: 8,
        columns: [
          { text: `__________________________\n\n${authUserName() || 'Gestor de Crédito'}\n\n(GESTOR DE CRÉDITO)` },
          String(cu.customerType || 'PF') === 'PJ'
            ? { text: `__________________________\n\n${cu.customerName || ''}\nRepresentada por: ${cu.companyLegalRepresentative || ''}` }
            : { text: `__________________________\n\n${cu.customerName || ''}\n\n(${convertGender(cu).trim()})` }
        ]
      }
    ],
    styles: { columnsTitle: { fontSize: 8, bold: true, color: '#000000' } }
  }

  pdfMake.createPdf(docDefinition).open()
}

// ============================================================
// 4. EXTRACTO DO CRÉDITO (layout original com TOTAIS)
// ============================================================
export async function generateExtractoCredito({ company, customer, loan, amortization = [], lateInterestByLoan = 0 }) {
  const pdfMake = await getPdfMake()
  const comp = company || {}
  const cust = customer || {}
  const loan_ = loan || {}
  const allAmorts = amortization || []
  const logoBase64 = await getCompanyLogoBase64(comp.companyLogo)

  const companyHeader = buildCompanyHeader(comp, logoBase64, 'Extracto do Crédito')

  // helpers das prestações
  const installmentTotalDue = (inst) => {
    const remaining = Math.max(0, Number(inst?.installment || 0) - Number(inst?.paidAmount || 0))
    const late = Number(inst?.latePaymentInterest || 0)
    return Math.round((remaining + late) * 100) / 100
  }

  // totals
  const totalInterest = allAmorts.reduce((s, r) => s + (parseFloat(r.rateAmount) || 0), 0)
  const contractTotal = allAmorts.reduce((s, r) => s + (parseFloat(r.installment) || 0), 0)
  const totalPaid = allAmorts.reduce((s, r) => s + (parseFloat(r.paidAmount) || 0), 0)
  const remaining = allAmorts.filter(r => Number(r.status) !== 1).reduce((s, r) => s + installmentTotalDue(r), 0)
  const paidCount = allAmorts.filter(r => Number(r.status) === 1).length
  const pendingCount = allAmorts.length - paidCount

  // client section
  const clientSection = [
    { text: 'DADOS DO CLIENTE', fontSize: 9, bold: true, color: '#1a237e', margin: [0, 0, 0, 6] },
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [[
          { text: [{ text: 'Nome: ', bold: true, fontSize: 8 }, { text: cust.customerName || '', fontSize: 8 }] },
          { text: [{ text: 'Conta: ', bold: true, fontSize: 8 }, { text: String(cust.accountNumber || ''), fontSize: 8 }] },
          { text: [{ text: 'Telefone: ', bold: true, fontSize: 8 }, { text: cust.customerPhone || '', fontSize: 8 }] },
          { text: [{ text: 'NUIT: ', bold: true, fontSize: 8 }, { text: cust.customerNuit || '', fontSize: 8 }] }
        ]]
      },
      layout: infoTableLayout,
      margin: [25, 0, 25, 12]
    }
  ]

  // summary section
  const summarySection = [
    { text: 'RESUMO DO CRÉDITO', fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
    {
      table: {
        widths: ['*', '*', '*', '*', '*'],
        body: [
          ['Capital Financiado', 'Taxa de Juros', 'Nº Prestações', 'Total Juros', 'Total Dívida'].map(t => ({ text: t, fontSize: 7, bold: true, color: '#666', alignment: 'center' })),
          [
            { text: formatMoney(loan_.amount), fontSize: 9, bold: true, alignment: 'center' },
            { text: `${((parseFloat(loan_.interestRate) || 0) * 100).toFixed(1)}%`, fontSize: 9, bold: true, alignment: 'center' },
            { text: `${loan_.numberOfInstallments || 0}`, fontSize: 9, bold: true, alignment: 'center' },
            { text: formatMoney(totalInterest), fontSize: 9, bold: true, alignment: 'center' },
            { text: formatMoney(contractTotal), fontSize: 9, bold: true, alignment: 'center', color: '#c62828' }
          ]
        ]
      },
      layout: { hLineWidth: (i) => (i === 0 || i === 2 ? 1 : 0.5), vLineWidth: () => 0.5, hLineColor: () => '#1a237e', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5 },
      margin: [25, 0, 25, 8]
    }
  ]

  // situação actual
  const statusSection = [
    { text: 'SITUAÇÃO ACTUAL', fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          ['Total Pago', 'Saldo Remanescente', 'Prestações Pagas', 'Prestações Pendentes'].map(t => ({ text: t, fontSize: 7, bold: true, alignment: 'center', color: t.startsWith('Total Pago') ? '#2e7d32' : t.startsWith('Saldo') ? '#c62828' : '#1a237e' })),
          [
            { text: formatMoney(totalPaid), fontSize: 9, bold: true, color: '#2e7d32', alignment: 'center' },
            { text: formatMoney(remaining), fontSize: 9, bold: true, color: '#c62828', alignment: 'center' },
            { text: `${paidCount} de ${allAmorts.length}`, fontSize: 9, bold: true, alignment: 'center' },
            { text: `${pendingCount}`, fontSize: 9, bold: true, alignment: 'center', color: '#f57c00' }
          ]
        ]
      },
      layout: { hLineWidth: (i) => (i === 0 || i === 2 ? 1 : 0.5), vLineWidth: () => 0.5, hLineColor: () => '#e0e0e0', vLineColor: () => '#e0e0e0', paddingTop: () => 5, paddingBottom: () => 5 },
      margin: [25, 0, 25, 12]
    }
  ]

  // plano — colunas Price, ordem EXATA do PDF oficial:
  // Ordem | Amortização | Juros | Prestação | Saldo | Vencimento
  const amortizacaoOf = (row) => {
    const prestacao = parseFloat(row.installment) || 0
    const juros = parseFloat(row.rateAmount) || 0
    // Amortização vem da BD (amortization_loans); fallback Price = prestação − juros
    return row.amortization != null
      ? parseFloat(row.amortization) || 0
      : Math.max(0, Math.round((prestacao - juros) * 100) / 100)
  }

  const installmentsBody = allAmorts.map(row => {
    const isPaid = Number(row.status) === 1
    return [
      { text: String(row.installmentOrder || ''), fontSize: 7, alignment: 'center' },
      { text: formatMoney(amortizacaoOf(row)), fontSize: 7, alignment: 'right' },
      { text: formatMoney(parseFloat(row.rateAmount) || 0), fontSize: 7, alignment: 'right' },
      { text: formatMoney(parseFloat(row.installment) || 0), fontSize: 7, alignment: 'right', bold: true },
      { text: formatMoney(Math.max(0, parseFloat(row.remainingBalance) || 0)), fontSize: 7, alignment: 'right', color: isPaid ? '#2e7d32' : '#c62828' },
      { text: formatDateShort(row.dueDate), fontSize: 7, alignment: 'center' }
    ]
  })

  installmentsBody.push([
    { text: 'TOTAIS', fontSize: 7, bold: true, color: '#1a237e' },
    { text: formatMoney(allAmorts.reduce((s, r) => s + amortizacaoOf(r), 0)), fontSize: 7, alignment: 'right', bold: true },
    { text: formatMoney(totalInterest), fontSize: 7, alignment: 'right', bold: true, color: '#1a237e' },
    { text: formatMoney(contractTotal), fontSize: 7, alignment: 'right', bold: true },
    { text: formatMoney(remaining), fontSize: 7, alignment: 'right', bold: true, color: '#c62828' },
    { text: '', fontSize: 7 }
  ])

  const amortSection = [
    { text: `PLANO DE AMORTIZAÇÃO (${allAmorts.length} prestações)`, fontSize: 9, bold: true, color: '#1a237e', margin: [25, 0, 25, 6] },
    {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
        body: [
          ['Ordem', 'Amortização', 'Juros', 'Prestação', 'Saldo', 'Vencimento'].map(t => ({ text: t, fontSize: 7, bold: true, color: '#fff', fillColor: '#1a237e', alignment: (t === 'Ordem' || t === 'Vencimento') ? 'center' : 'right' })),
          ...installmentsBody
        ]
      },
      layout: commonTableLayout,
      margin: [25, 0, 25, 12]
    }
  ]

  const docDefinition = {
    footer: footerFor(comp),
    content: [
      ...companyHeader,
      clientSection,
      summarySection,
      statusSection,
      amortSection
    ].flat(),
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [25, 15, 25, 15]
  }
  pdfMake.createPdf(docDefinition).open()
}

// ============================================================
function authUserName() {
  try {
    const raw = localStorage.getItem('auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.user?.name || parsed?.userName || ''
    }
  } catch { /* silent */ }
  return ''
}

// ============================================================
// DISPATCHER
// ============================================================
export async function generateLegalDoc(tipo, payload) {
  switch (tipo) {
    case 'contrato': return generateContratoConcessao(payload)
    case 'termo': return generateTermoCompromisso(payload)
    case 'garantias': return generateDeclaracaoGarantias(payload)
    case 'extracto': return generateExtractoCredito(payload)
    default: throw new Error(`Tipo de documento desconhecido: ${tipo}`)
  }
}

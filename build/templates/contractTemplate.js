"use strict";
// Template HTML do Contrato de Concessão de Empréstimo
// Com variáveis {{variavel}} que são substituídas pelos dados reais
Object.defineProperty(exports, "__esModule", { value: true });
exports.guaranteeDeclarationHTML = exports.commitmentTermHTML = exports.contractTemplateHTML = void 0;
exports.contractTemplateHTML = `
<h2 style="text-align: center; font-size: 16pt;">CONTRATO DE CONCESSÃO DE EMPRÉSTIMO</h2>

<p style="text-align: justify; font-size: 10pt; line-height: 1.6;">
O Mutuário necessita de um empréstimo de <strong>{{loanAmountFormatted}}</strong> ({{loanAmountWords}} meticais), para a implementação de negócio;
</p>
<p style="text-align: justify; font-size: 10pt; line-height: 1.6;">
O Mutuante encontra-se com a disponibilidade necessária e, em condições de conceder o empréstimo ao Mutuário;
</p>
<p style="text-align: justify; font-size: 10pt; line-height: 1.6;">
É celebrado o presente Contrato Individual de Crédito com confissão de dívida, que se regerá pelos Termos e Condições Gerais do Contrato Individual do Crédito com confissão de dívida e, pelas seguintes cláusulas:
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA PRIMEIRA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Objecto do Contrato)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
1. O presente contrato tem por objecto, regular a concessão de um empréstimo, em forma de mútuo que o Mutuante disponibiliza ao Mutuário e, este último confessa-se para todos os efeitos legais, devedor do Mutuante, no montante de capital de <strong>{{loanAmountFormatted}}</strong> ({{loanAmountWords}} meticais), acrescidos de juros acordados de <strong>{{interestRateFormatted}}</strong> que, irão vencendo nos termos e condições indicados nas cláusulas que se seguem.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA SEGUNDA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Disponibilização do Empréstimo)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
1. O valor do empréstimo foi entregue ao Mutuário, através do desembolso directo na conta do Mutuário, na quantia referida na cláusula anterior e, que para todos efeitos legais o Mutuário confessou-se devedor;
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
2. Considera-se como data de entrada em vigor do empréstimo, a data da disponibilização da quantia mutuada ao Mutuário pelo Mutuante.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA TERCEIRA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Forma e Prazo de Pagamento)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
1. O presente contrato é celebrado por um período de <strong>{{numberOfInstallments}} meses</strong>, contados a partir da data da sua assinatura, devendo o Mutuário proceder ao reembolso do capital emprestado e respectivos juros, em prestações mensais iguais e consecutivas, conforme plano de amortização em anexo.
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
2. O Mutuário deverá proceder ao reembolso do capital emprestado e juros, nas datas previstas no plano de amortização, mediante transferência bancária ou depósito directo nas contas do Mutuante.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA QUARTA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Taxa de Juros)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
1. O montante desembolsado e que constitui a dívida confessada, no presente contrato, vence juros remuneratórios, sendo estes calculados e contabilizados mensalmente, sobre o capital em dívida e pagáveis conjuntamente com o reembolso do capital em dívida em consonância com o plano de pagamento em anexo que é parte integrante do presente contrato. A taxa de juro aplicada é de <strong>{{interestRateFormatted}} ao mês</strong>.
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
2. Os valores descritos no número anterior e o plano de pagamento de rendas anexo a este contrato, são calculados em função do período estabelecido para pagamento normal da dívida, alterando-se, consequentemente, em caso de não pagamento pontual, cumprimento retardado ou incumprimento definitivo, tendo em conta os agravamentos e as penalizações previstas neste contrato;
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
3. As partes ainda acordam e aceitam que a taxa de juro prevista no nº 1 desta cláusula poderá sofrer alterações de acordo com as políticas de juros que estiverem em vigor no momento.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA QUINTA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Forma de Pagamento)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
As rendas mensais de capital e juros a amortizar, de acordo com o plano de rendas acima, serão pagas pelo Mutuário ao Mutuante, através de crédito a efectuar pelo Mutuário nas seguintes contas tituladas pelo Mutuante:
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
Banco: {{bankName}} | Conta: {{bankAccount}} | IBAN: {{bankIBAN}}
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
O Mutuário deverá efectuar o pagamento até ao {{paymentDueDay}} de cada mês.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA SEXTA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Comprovação do Pagamento)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
O talão de depósito ou nota de transferência bancária servem como prova de reembolso da prestação devida, efectuado pelo Mutuário na conta do Mutuante, devendo ser apresentado ao Mutuante, para efeitos de controlo da liquidação da prestação devida e do ónus de prova que recai sobre o Mutuário.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA SÉTIMA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Taxa de Preparos)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
Pela operação o Mutuário paga uma taxa de preparos de <strong>{{preparationFeeFormatted}}</strong> ({{preparationFeeWords}} meticais), correspondentes a 1% sobre o capital do empréstimo solicitado, sendo estes liquidados de uma só vez na data do desembolso do capital.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA OITAVA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Juros Moratórios e Incumprimento)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
1. A mora pela amortização de qualquer prestação vencida implica a aplicação de juros moratórios de <strong>{{lateInterestRate}}</strong>% por dia, a calcular sobre o capital e juros das prestações vencidas, durante o tempo em que se verificar o incumprimento, sujeito a mudanças e conformidade como precário em vigor, e que será acrescido a essa prestação vencida, até a data do efectivo pagamento;
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
2. Considera-se cumprimento defeituoso, retardado ou incumprimento o não pagamento total e pontual do valor a reembolsar, por cada prestação de acordo com preceituado nas cláusulas 4ª e 5ª do presente contrato e do espelhado no plano de pagamento em apenso a este contrato o qual é parte integrante.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA NONA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Garantias do Empréstimo)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
Para este empréstimo, o Mutuário apresenta como garantias:
</p>
{{guaranteesSection}}

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Reutilização de Garantias)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
As garantias descritas na cláusula nona poderão ser usadas em futuros créditos, mediante solicitação de novo empréstimo. O montante de crédito será actualizado por uma adenda ou por um novo contrato em relação às garantias oferecidas.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA PRIMEIRA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Preferência de Crédito)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
Caso venha a ocorrer uma situação em que o Mutuário, não possa cumprir pontualmente e integralmente com todas as suas obrigações, o Mutuante concorre, pelo menos, em igualdade de circunstância com os restantes credores no Mutuário, sendo as obrigações emergentes do presente contrato de empréstimo satisfeitas, pelo menos, nas mesmas datas e na mesma proporção em que forem satisfeitos, quaisquer outros empréstimos de que, o Mutuário seja ou venham a ser devedor.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA SEGUNDA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Execução das Garantias)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
1. Em caso de incumprimento do presente pelo Mutuário, o Mutuante reserva-se ao direito de se fazer pelas garantias assumidas sem recurso aos tribunais e só depois, caso o montante da garantia não seja suficiente para cobrir a dívida se recorrerá às instâncias judiciais competentes;
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
2. Ao abrigo do presente contrato, o Mutuário obriga-se a proceder à entrega voluntária dos bens dados referenciados na cláusula nove deste contrato, assim que o Mutuante o exigir;
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA TERCEIRA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Vencimento Antecipado)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
O Crédito objecto do presente contrato considera-se vencido e automaticamente todo o capital e juros em dívida nos seguintes casos:
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
a) Pela falta de pagamento de uma ou mais prestações vencidas;
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
b) A aplicação para fins diferentes daqueles pelos quais o financiamento foi destinado ou apresentação de documentos viciados ou falsas declarações que visem justificar o crédito.
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
Em qualquer dos casos acima referidos nesta cláusula, fica o Mutuante com a faculdade, sem aviso prévio ao Mutuário, em proceder à execução dos bens suficientes até ao valor do capital e juros devidos, resultantes do crédito objecto do presente contrato de acordo com o estipulado nos Termos e Condições Gerais do Contrato Individual de Crédito.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA QUARTA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Comunicações)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
Todas as comunicações entre o Mutuante e o Mutuário deverão ser efectuadas por escrito, e dirigidas para os endereços constantes no Contrato Individual de Crédito.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA QUINTA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Residência Fiscal)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
O Mutuário declara ser residente fiscal em Moçambique, estando em conformidade com a legislação fiscal em vigor no país.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA SEXTA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Despesas)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
1. Todas as despesas inerentes à execução do presente contrato, incluindo o valor de impostos de selo, termo de autenticação notorial, correm por conta e responsabilidade do Mutuário.
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
2. São ainda da responsabilidade do Mutuante todas as despesas administrativas, extrajudiciais e judiciais relativas à cobrança da dívida deste contrato pelo incumprimento, incluindo honorários pela contratação do Advogado.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA SÉTIMA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Penalizações)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
1. No caso de atraso no pagamento de qualquer prestação, o Mutuário ficará sujeito à aplicação de uma multa de <strong>{{lateFeeFixed}}</strong> MT por dia de atraso, sem prejuízo da aplicação dos juros moratórios previstos na cláusula oitava;
</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
2. A multa será cobrada automaticamente e adicionada ao valor da prestação em atraso.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA OITAVA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Força Maior)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
Nenhuma das partes será responsabilizada pelo não cumprimento das suas obrigações decorrentes do presente contrato, caso tal não cumprimento resulte de caso fortuito ou força maior devidamente comprovada.
</p>

<h3 style="text-align: center; font-size: 11pt; margin-top: 20px;">CLÁUSULA DÉCIMA NONA</h3>
<p style="text-align: center; font-size: 9pt; font-style: italic;">(Acordo)</p>
<p style="text-align: justify; font-size: 9pt; line-height: 1.6;">
O presente contrato vai ser assinado em duplicado, ficando uma à disposição do Mutuante e outra do Mutuário.
</p>

<p style="text-align: center; font-size: 10pt; margin-top: 40px;">
Mukhatine, {{disbursementDate}}
</p>

<table style="width: 100%; margin-top: 60px; font-size: 10pt;">
  <tr>
    <td style="width: 50%; text-align: left; vertical-align: top;">
      O Mutuante:<br><br><br>
      _________________________________<br>
      {{companyRepresentative}}<br>
      <small>{{companyName}}</small>
    </td>
    <td style="width: 50%; text-align: right; vertical-align: top;">
      O Mutuário:<br><br><br>
      _________________________________<br>
      {{customerName}}
    </td>
  </tr>
</table>
`;
// Template HTML do Termo de Compromisso de Recebimento
exports.commitmentTermHTML = `
<h2 style="text-align: center; font-size: 16pt;">TERMO DE COMPROMISSO DE RECEBIMENTO DE CRÉDITO</h2>

<p style="text-align: justify; font-size: 10pt; line-height: 1.8; margin-top: 30px;">
Pelo presente, eu <strong>{{customerName}}</strong>, Cidadão(a) moçambicano(a) com o nº do BI <strong>{{customerNationalId}}</strong>, <strong>declaro que recebi</strong> na data de hoje, o valor de <strong>{{loanAmountFormatted}}</strong> (<strong>{{loanAmountWords}} meticais</strong>), em:
</p>

<p style="font-size: 10pt; line-height: 1.8; margin: 20px 0;">
Cheque (________) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Numerário (________) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Transferência (________)
</p>

<p style="text-align: justify; font-size: 10pt; line-height: 1.8;">
da <strong>{{companyName}}</strong>, com sede em {{companyAddress}}, Nuit {{companyNuit}}.
</p>

<p style="text-align: justify; font-size: 10pt; line-height: 1.8; margin-top: 30px;">
Sendo expressão da verdade e sem qualquer coação, firmo presente.
</p>

<p style="text-align: center; font-size: 10pt; margin-top: 50px;">
Mukhatine, {{disbursementDate}}
</p>

<table style="width: 100%; margin-top: 80px; font-size: 10pt;">
  <tr>
    <td style="width: 50%; text-align: left; vertical-align: top;">
      O Mutuante:<br><br><br>
      _________________________________<br>
      {{companyRepresentative}}<br>
      <small>{{companyName}}</small>
    </td>
    <td style="width: 50%; text-align: right; vertical-align: top;">
      O Mutuário:<br><br><br>
      _________________________________<br>
      {{customerName}}
    </td>
  </tr>
</table>
`;
// Template HTML da Declaração de Bens de Garantia
exports.guaranteeDeclarationHTML = `
<h2 style="text-align: center; font-size: 16pt;">LISTA DE BENS DE GARANTIA</h2>

<p style="font-size: 10pt; line-height: 1.8; margin-top: 20px;"><strong>1. Dados do Cliente</strong></p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>{{customerGenderLabel}}:</strong> {{customerName}}</p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>Nº do cliente:</strong> {{accountNumber}}</p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>Morada:</strong> {{customerAddress}}</p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>Telemóvel:</strong> {{customerPhone}}</p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>NUIT:</strong> {{customerNuit}}</p>

<p style="font-size: 10pt; line-height: 1.8; margin-top: 20px;"><strong>2. Bens de Garantia</strong></p>

<table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
  <thead>
    <tr style="background-color: #f0f0f0;">
      <th style="border: 1px solid #ccc; padding: 8px; text-align: center;">Nº</th>
      <th style="border: 1px solid #ccc; padding: 8px;">Descrição do Bem</th>
      <th style="border: 1px solid #ccc; padding: 8px; text-align: right;">Valor Estimado (MT)</th>
    </tr>
  </thead>
  <tbody>
    {{guaranteesTableRows}}
  </tbody>
  <tfoot>
    <tr style="background-color: #f0f0f0; font-weight: bold;">
      <td colspan="2" style="border: 1px solid #ccc; padding: 8px; text-align: right;">Total</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">{{totalGuaranteeAmount}}</td>
    </tr>
  </tfoot>
</table>

<p style="font-size: 10pt; line-height: 1.8; margin-top: 20px;"><strong>3. Crédito Solicitado</strong></p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>Montante:</strong> {{loanAmountFormatted}}</p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>Taxa de Juros:</strong> {{interestRateFormatted}} ao mês</p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>Nº Prestações:</strong> {{numberOfInstallments}} meses</p>
<p style="font-size: 10pt; line-height: 1.6;"><strong>Total com Juros:</strong> {{loanTotalWithInterest}}</p>

<p style="text-align: justify; font-size: 10pt; line-height: 1.8; margin-top: 30px;">
E por ser verdade, certifico que todas as informações por mim prestadas ao Gestor de Crédito, bem como os bens acima descritos, servem de garantia para a satisfação da obrigação prevista no contrato de concessão de empréstimo celebrado com a <strong>{{companyName}}</strong>.
</p>

<p style="text-align: center; font-size: 10pt; margin-top: 40px;">
Mukhatine, {{disbursementDate}}
</p>

<table style="width: 100%; margin-top: 60px; font-size: 10pt;">
  <tr>
    <td style="width: 50%; text-align: left; vertical-align: top;">
      O Mutuante:<br><br><br>
      _________________________________<br>
      {{companyRepresentative}}<br>
      <small>{{companyName}}</small>
    </td>
    <td style="width: 50%; text-align: right; vertical-align: top;">
      O Mutuário:<br><br><br>
      _________________________________<br>
      {{customerName}}
    </td>
  </tr>
</table>
`;

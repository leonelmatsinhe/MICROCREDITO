// Formatar valor monetário
export function formatMoney(value) {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0) + ' MT'
}

// Formatar valor sem símbolo
export function formatMoneyValue(value) {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0)
}

// Converter número por extenso (português)
export function numberToWords(num) {
  if (num === 0) return 'zero'

  const ones = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove']
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
  const thousands = ['', 'mil', 'milhão', 'mil milhões', 'bilião']

  function convertGroup(n) {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' e ' + ones[n % 10] : '')
    }
    if (n < 1000) {
      const h = Math.floor(n / 100)
      const remainder = n % 100
      return hundreds[h] + (remainder !== 0 ? ' e ' + convertGroup(remainder) : '')
    }
    return ''
  }

  const intPart = Math.floor(Math.abs(num))
  const decPart = Math.round((Math.abs(num) - intPart) * 100)

  if (intPart === 0 && decPart === 0) return 'zero'

  let result = ''
  let remaining = intPart
  let groupIndex = 0

  while (remaining > 0) {
    const group = remaining % 1000
    if (group !== 0) {
      let groupText = convertGroup(group)
      if (groupIndex === 2 && group === 1) {
        groupText = 'um milhão'
      } else if (groupIndex > 2) {
        groupText += ' ' + thousands[groupIndex]
      } else if (groupIndex === 1) {
        if (group === 1) {
          groupText = 'mil'
        } else {
          groupText += ' mil'
        }
      }
      if (result !== '') {
        groupText += (group < 100 && remaining >= 1000) ? ' e ' : ''
      }
      result = groupText + (result !== '' ? ' e ' : '') + result
    }
    remaining = Math.floor(remaining / 1000)
    groupIndex++
  }

  return result
}

// Formatar data
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-MZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Formatar data curta
export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-MZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// Formatar taxa de juros
export function formatInterestRate(rate) {
  return (rate * 100).toFixed(1).replace('.', ',') + '%'
}

// Formatar gênero
export function formatGender(gender) {
  if (!gender) return ''
  const g = gender.toLowerCase()
  if (g === 'm' || g === 'masculino') return 'Mulher'
  if (g === 'f' || g === 'feminino') return 'Homem'
  return gender
}

// Formatar gênero label
export function formatGenderLabel(gender) {
  if (!gender) return ''
  const g = gender.toLowerCase()
  if (g === 'm' || g === 'masculino') return 'Mulher'
  if (g === 'f' || g === 'feminino') return 'Homem'
  return gender
}

// Formatar moeda simples
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0)
}

// Obter iniciais de um nome
export function getInitials(name) {
  if (!name) return ''
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

// Tempo relativo (há X minutos, horas, dias...)
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return 'agora'
  if (diffMin < 60) return `há ${diffMin}min`
  if (diffHr < 24) return `há ${diffHr}h`
  if (diffDay < 7) return `há ${diffDay}d`
  if (diffWeek < 4) return `há ${diffWeek}sem`
  return `há ${diffMonth}m`
}

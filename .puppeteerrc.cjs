/**
 * Configuração do Puppeteer.
 * No Heroku, o Chromium não está disponível por padrão.
 * Saltar o download evita erros de build e exceder o limite de slug.
 */
module.exports = {
  skipDownload: true,
};

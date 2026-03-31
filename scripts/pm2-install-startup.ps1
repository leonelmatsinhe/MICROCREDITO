# Configura o Windows para restaurar os processos PM2 guardados ao iniciar sessão/sistema.
# Pré-requisito global: npm install -g pm2 pm2-windows-startup
# Depois de instalar, execute uma vez: npm run deploy:pm2  (ou pm2 save) para gravar a lista.

$ErrorActionPreference = "Stop"

$pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2) {
  throw "PM2 não está no PATH. Instale: npm install -g pm2 pm2-windows-startup"
}

$startup = Get-Command pm2-startup -ErrorAction SilentlyContinue
if (-not $startup) {
  throw @"
O pacote 'pm2-windows-startup' não está instalado ou 'pm2-startup' não está no PATH.

Instale globalmente (PowerShell como administrador recomendado para o hook de arranque):
  npm install -g pm2-windows-startup

Depois volte a executar:
  npm run pm2:startup
"@
}

Write-Host "A instalar hook de arranque do PM2 no Windows (pm2-startup install)..." -ForegroundColor Cyan
& pm2-startup install
if ($LASTEXITCODE -ne 0) {
  throw "pm2-startup install falhou (código $LASTEXITCODE). Tente executar o PowerShell como Administrador."
}

Write-Host ""
Write-Host "Arranque automático configurado." -ForegroundColor Green
Write-Host "Certifique-se de que a lista de processos está gravada após o deploy:"
Write-Host "  npm run deploy:pm2"
Write-Host "  (isto executa pm2 save automaticamente)"

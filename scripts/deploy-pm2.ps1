Param(
  [string]$AppName = "microcredito"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$backendEntry = Join-Path $projectRoot "build\src\app.js"
$frontendIndex = Join-Path $projectRoot "public\index.html"

if (-not (Test-Path $backendEntry)) {
  throw "Arquivo de arranque não encontrado: $backendEntry. Compile o backend antes (ex.: npx tsc)."
}

if (-not (Test-Path $frontendIndex)) {
  throw "Arquivo do frontend não encontrado: $frontendIndex. Gere/copie os assets para a pasta public antes do deploy."
}

$pm2Cmd = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Cmd) {
  throw "PM2 não encontrado no PATH. Instale com: npm install -g pm2 pm2-windows-startup"
}

$ecosystem = Join-Path $projectRoot "ecosystem.config.cjs"
if (-not (Test-Path $ecosystem)) {
  throw "Ficheiro ecosystem não encontrado: $ecosystem"
}

Write-Host "Validações concluídas. Iniciando/atualizando processo PM2 (ecosystem)..." -ForegroundColor Cyan

# startOrReload: cria o processo na 1ª vez ou recarrega sem duplicar
pm2 startOrReload $ecosystem --update-env
if ($LASTEXITCODE -ne 0) {
  throw "PM2 startOrReload falhou (código $LASTEXITCODE)."
}

pm2 save

Write-Host ""
Write-Host "Deploy PM2 concluído com sucesso." -ForegroundColor Green
Write-Host "Processo: $AppName"
Write-Host "Comando de estado: pm2 list"

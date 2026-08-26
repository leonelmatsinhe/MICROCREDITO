# deploy.ps1 - Script de deploy para o AMBIENTE LOCAL (Windows)
#
# Flujo: git add -> commit -> push para GitHub
# (O build e restart sao feitos no servidor com deploy.sh)
#
# Uso (PowerShell):
#   .\scripts\deploy.ps1                        # mensagem padrao
#   .\scripts\deploy.ps1 -Message "Correcao"    # mensagem personalizada
#
Param(
  [string]$Message = "Deploy automatico"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $projectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY LOCAL - MBR Microcredito"        -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Git: add + commit
Write-Host ""
Write-Host "[1/2] A gravar alteracoes no git..." -ForegroundColor Yellow
git add -A
$staged = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace($staged)) {
  Write-Host "  -> Nenhuma alteracao para commitar." -ForegroundColor Gray
} else {
  git commit -m $Message
  Write-Host "  -> Commit criado." -ForegroundColor Green
}

# 2. Push para GitHub
Write-Host ""
Write-Host "[2/2] A enviar para o GitHub..." -ForegroundColor Yellow
git push
Write-Host "  -> Push concluido." -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  PUSH CONCLUIDO!"                         -ForegroundColor Green
Write-Host "  Agora faca pull no servidor Ubuntu:"     -ForegroundColor Green
Write-Host "    ./scripts/deploy.sh"                   -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Green

# deploy.ps1 - Deploy LOCAL (Windows) — só faz git push
#
# O build e o restart sao feitos NO SERVIDOR pelo scripts/deploy.sh
# (suporta layout single e multi-tenant com prod + demo).
#
# Uso (PowerShell):
#   .\scripts\deploy.ps1                        # mensagem padrao
#   .\scripts\deploy.ps1 -Message "Correcao"    # mensagem personalizada
#   .\scripts\deploy.ps1 -Branch feature/x      # branch especifica
#
Param(
  [string]$Message = "Deploy automatico",
  [string]$Branch = ""
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
if ($Branch) {
  git push -u origin $Branch
} else {
  git push
}
Write-Host "  -> Push concluido." -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  PUSH CONCLUIDO!"                         -ForegroundColor Green
Write-Host "  O servidor vai fazer o resto:"           -ForegroundColor Green
Write-Host "    (hook/CI) ou manualmente na VPS:"      -ForegroundColor White
Write-Host "      ./scripts/deploy.sh"                  -ForegroundColor White
Write-Host "                                            " -ForegroundColor White
Write-Host "  Layout multi-tenant detectado no servidor" -ForegroundColor White
Write-Host "  (/opt/microcredito/tenant-a + tenant-b)"   -ForegroundColor White
Write-Host "  => cada tenant e deployado de forma ATOMICA:" -ForegroundColor White
Write-Host "     prod (tenant-a) primeiro, demo (tenant-b) depois;" -ForegroundColor White
Write-Host "     falha do demo nunca derruba o prod."   -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Green

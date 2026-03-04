param(
  [string]$BaseUrl = "http://localhost:3000",
  [int]$CompanyId = 1
)

$ErrorActionPreference = "Stop"

function Invoke-JsonRequest {
  param(
    [string]$Url,
    [string]$Method = "GET"
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing
    $json = $null
    if ($response.Content) {
      $json = $response.Content | ConvertFrom-Json
    }
    return @{
      StatusCode = [int]$response.StatusCode
      Json = $json
    }
  }
  catch {
    if ($_.Exception.Response) {
      $statusCode = [int]$_.Exception.Response.StatusCode.value__
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      $json = $null
      if ($body) {
        try {
          $json = $body | ConvertFrom-Json
        }
        catch {
          $json = $null
        }
      }
      return @{
        StatusCode = $statusCode
        Json = $json
      }
    }
    throw "Nao foi possivel conectar em '$Url'. Garanta que a API esteja em execucao (ex.: npm run dev:server)."
  }
}

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    throw "FALHA: $Message"
  }
}

function Assert-Status {
  param(
    [int]$Actual,
    [int]$Expected,
    [string]$Label
  )
  Assert-True -Condition ($Actual -eq $Expected) -Message "$Label - esperado HTTP $Expected, recebido $Actual"
}

function Assert-HasProperty {
  param(
    [object]$Obj,
    [string]$Prop,
    [string]$Label
  )
  $hasProp = ($null -ne $Obj) -and ($Obj.PSObject.Properties.Name -contains $Prop)
  Assert-True -Condition $hasProp -Message "$Label - propriedade '$Prop' ausente"
}

$baseEndpoint = "$BaseUrl/api/dashboard/$CompanyId"
$today = Get-Date -Format "yyyy-MM-dd"
$from = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")

Write-Host ""
Write-Host "=== Smoke test contrato dashboard ===" -ForegroundColor Cyan
Write-Host "Base URL : $BaseUrl"
Write-Host "CompanyId: $CompanyId"

# 1) Happy path sem filtros
$r1 = Invoke-JsonRequest -Url $baseEndpoint
Assert-Status -Actual $r1.StatusCode -Expected 200 -Label "GET sem filtros"
Assert-HasProperty -Obj $r1.Json -Prop "success" -Label "GET sem filtros"
Assert-True -Condition ([bool]$r1.Json.success) -Message "GET sem filtros - success deve ser true"
Assert-HasProperty -Obj $r1.Json -Prop "filters" -Label "Contrato"
Assert-HasProperty -Obj $r1.Json -Prop "kpis" -Label "Contrato"
Assert-HasProperty -Obj $r1.Json -Prop "riskByManager" -Label "Contrato"
Assert-HasProperty -Obj $r1.Json -Prop "alerts" -Label "Contrato"
Assert-HasProperty -Obj $r1.Json.kpis -Prop "loans" -Label "Contrato kpis"
Assert-HasProperty -Obj $r1.Json.kpis -Prop "financial" -Label "Contrato kpis"
Assert-HasProperty -Obj $r1.Json.kpis -Prop "delinquency" -Label "Contrato kpis"
Write-Host "[OK] GET sem filtros" -ForegroundColor Green

# 2) Happy path com filtros
$r2 = Invoke-JsonRequest -Url "$baseEndpoint?from=$from&to=$today"
Assert-Status -Actual $r2.StatusCode -Expected 200 -Label "GET com periodo valido"
Assert-True -Condition ([bool]$r2.Json.success) -Message "GET com periodo valido - success deve ser true"
Write-Host "[OK] GET com periodo valido" -ForegroundColor Green

# 3) Erro esperado: from > to
$r3 = Invoke-JsonRequest -Url "$baseEndpoint?from=2026-12-31&to=2026-01-01"
Assert-Status -Actual $r3.StatusCode -Expected 400 -Label "GET com from > to"
Write-Host "[OK] GET com from > to devolve 400" -ForegroundColor Green

# 4) Erro esperado: data invalida
$r4 = Invoke-JsonRequest -Url "$baseEndpoint?from=31-12-2026&to=2026-01-01"
Assert-Status -Actual $r4.StatusCode -Expected 400 -Label "GET com data invalida"
Write-Host "[OK] GET com data invalida devolve 400" -ForegroundColor Green

# 5) Erro esperado: creditManager invalido
$r5 = Invoke-JsonRequest -Url "$baseEndpoint?creditManager=abc"
Assert-Status -Actual $r5.StatusCode -Expected 400 -Label "GET com creditManager invalido"
Write-Host "[OK] GET com creditManager invalido devolve 400" -ForegroundColor Green

# 6) Erro esperado: status invalido
$r6 = Invoke-JsonRequest -Url "$baseEndpoint?status=ativo"
Assert-Status -Actual $r6.StatusCode -Expected 400 -Label "GET com status invalido"
Write-Host "[OK] GET com status invalido devolve 400" -ForegroundColor Green

Write-Host ""
Write-Host "SUCESSO: smoke test do contrato concluido." -ForegroundColor Cyan

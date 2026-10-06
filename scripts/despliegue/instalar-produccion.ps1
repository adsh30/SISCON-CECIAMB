<#
  Instala la copia de PRODUCCIÓN de SISCON-CECIAMB y deja el bot de despliegue
  arrancando solo al iniciar sesión en Windows.

  Uso (PowerShell, desde la carpeta del repositorio de desarrollo):
    powershell -ExecutionPolicy Bypass -File scripts\despliegue\instalar-produccion.ps1
  Opcional:
    -Destino C:\SISCON-CECIAMB   carpeta de producción (por defecto)
    -Puerto 8080                 puerto del sistema en la red interna
    -AbrirFirewall               permite el acceso desde otras PCs (requiere administrador)
#>
param(
  [string]$Destino = 'C:\SISCON-CECIAMB',
  [int]$Puerto = 8080,
  [switch]$AbrirFirewall
)

$ErrorActionPreference = 'Stop'
$Origen = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Tarea = 'SISCON-CECIAMB (sistema contable)'

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

function Ejecutar($comando, $argumentos) {
  & $comando @argumentos
  if ($LASTEXITCODE -ne 0) { throw "$comando $($argumentos -join ' ') falló (código $LASTEXITCODE)" }
}

# 1. Copia de producción en la rama main
if (-not (Test-Path (Join-Path $Destino '.git'))) {
  Paso "Clonando la rama main en $Destino"
  $repo = (git -C $Origen remote get-url origin).Trim()
  Ejecutar git @('clone', '--branch', 'main', $repo, $Destino)
} else {
  Paso "Ya existe $Destino; se usa tal cual"
}

# 2. Configuración (.env) a partir de la de desarrollo
$envDestino = Join-Path $Destino '.env'
if (-not (Test-Path $envDestino)) {
  Paso 'Creando .env de producción'
  $lineas = Get-Content (Join-Path $Origen '.env') -Encoding UTF8
  $valores = @{
    'NODE_ENV'      = 'production'
    'PORT'          = "$Puerto"
    'CLIENT_ORIGIN' = "http://localhost:$Puerto"
    'COOKIE_SECURE' = 'false'
    'BOT_RAMA'      = 'main'
  }
  foreach ($clave in $valores.Keys) {
    $patron = "^$clave="
    if ($lineas -match $patron) {
      $lineas = $lineas -replace "$patron.*", "$clave=$($valores[$clave])"
    } else {
      $lineas += "$clave=$($valores[$clave])"
    }
  }
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($envDestino, $lineas, $utf8)
}

# 3. Dependencias, compilación y base de datos
Push-Location $Destino
try {
  Paso 'Instalando dependencias'
  Ejecutar npm.cmd @('ci', '--include=dev', '--no-audit', '--no-fund')
  Paso 'Compilando la interfaz'
  Ejecutar npm.cmd @('run', 'build')
  Paso 'Actualizando la base de datos'
  Ejecutar npm.cmd @('run', 'db:migrate')
  Ejecutar npm.cmd @('run', 'db:seed')
} finally {
  Pop-Location
}

# 4. Tarea programada: el bot arranca al iniciar sesión y se reinicia si se cae
Paso "Registrando la tarea programada '$Tarea'"
$node = (Get-Command node).Source
$accion = New-ScheduledTaskAction -Execute $node -Argument 'scripts\despliegue\bot.mjs' -WorkingDirectory $Destino
$disparador = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $Tarea -Action $accion -Trigger $disparador -Settings $ajustes `
  -Description 'Mantiene SISCON-CECIAMB encendido y publica automáticamente los cambios de la rama main.' `
  -Force | Out-Null
Start-ScheduledTask -TaskName $Tarea

# 5. Acceso desde otras PCs de la red (opcional)
if ($AbrirFirewall) {
  Paso "Abriendo el puerto $Puerto en el firewall (red privada)"
  New-NetFirewallRule -DisplayName "SISCON-CECIAMB $Puerto" -Direction Inbound -Protocol TCP `
    -LocalPort $Puerto -Action Allow -Profile Private,Domain | Out-Null
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -ne 'WellKnown' } |
  Select-Object -First 1).IPAddress
Write-Host "`nListo. SISCON-CECIAMB queda en:" -ForegroundColor Green
Write-Host "  En este equipo:  http://localhost:$Puerto"
Write-Host "  En la red:       http://${ip}:$Puerto"
Write-Host "  Registro del bot: $Destino\logs\bot.log"

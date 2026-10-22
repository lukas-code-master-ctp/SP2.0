# Prueba el proxy chileno (PROXY_CL_URL del .env) contra la TGR, sin mostrar la clave.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\probar-proxy.ps1 [-Veces 5]
# Cada intento muestra la IP y el país de salida y qué responde la TGR. Sirve para comparar con la conexión
# directa (sin proxy) y para mandarle el resultado al soporte del proveedor.
param([int]$Veces = 5)

if (-not (Test-Path .env)) { throw "No encuentro el .env: ejecuta el script desde la carpeta del proyecto." }
$linea = Get-Content .env | Where-Object { $_ -match '^\s*PROXY_CL_URL\s*=' } | Select-Object -First 1
if (-not $linea) { throw "Falta PROXY_CL_URL en el .env" }
$proxy = ($linea -replace '^\s*PROXY_CL_URL\s*=\s*', '').Trim().Trim('"')
$destinos = "https://tgr.gob.cl/certificado-deuda-contribuciones/", "https://www.tgr.cl/"

function Probar([string]$titulo, [string[]]$extra) {
  Write-Host "`n== $titulo" -ForegroundColor Cyan
  $ip = curl.exe -s -m 20 @extra https://ipinfo.io/json | ConvertFrom-Json
  Write-Host ("Sale por IP {0} ({1}, {2})" -f $ip.ip, $ip.country, $ip.org)
  foreach ($d in $destinos) {
    # Bloqueada, la TGR responde "AccessDenied" (403) o una página titulada "no encontrada" con código 200.
    $html = (curl.exe -s -m 30 -A "Mozilla/5.0" @extra $d) -join "`n"
    $estado = if (-not $html) { "SIN RESPUESTA" } elseif ($html -match "<Code>AccessDenied<|no encontrada</title>") { "BLOQUEADO" } else { "OK" }
    Write-Host ("  {0,-13} {1}" -f $estado, $d)
  }
}

Probar "Directo (tu conexión)" @()
for ($i = 1; $i -le $Veces; $i++) { Probar "Proxy, intento $i" @("-x", $proxy) }

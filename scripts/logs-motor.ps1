# Guarda en logs-<n>.txt los logs del motor (Cloud Run sp2-motor) de una solicitud.
# Uso: .\scripts\logs-motor.ps1 -Solicitud 1012 [-Horas 3]
param(
  [Parameter(Mandatory = $true)][int]$Solicitud,
  [int]$Horas = 3,
  [string]$Proyecto = "smartprop2-0"
)
# Sin comillas dobles dentro del filtro: PowerShell las rompe al pasarlas a gcloud.
$filtro = "resource.type=cloud_run_revision AND resource.labels.service_name=sp2-motor AND (textPayload:$Solicitud OR textPayload:trabajo)"
$salida = Join-Path (Get-Location) "logs-$Solicitud.txt"
gcloud logging read $filtro --project $Proyecto --freshness "$($Horas)h" --order asc --limit 2000 --format "value(timestamp,textPayload)" |
  Out-File -Encoding utf8 $salida
Write-Host "Listo: $salida ($((Get-Content $salida).Count) lineas)"

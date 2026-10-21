# Deja el motor desplegándose solo: cada vez que se fusiona algo en main que toque el motor, Cloud Build
# construye la imagen y la pone en sp2-motor (cloudbuild.motor.yaml). Se corre una sola vez.
# Antes, en la consola de Cloud Build (región southamerica-west1): Repositorios > 2ª gen > Crear conexión
# de host > GitHub, autorizar la app y "Vincular repositorio" con lukas-code-master-ctp/SP2.0.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\activar-autodespliegue.ps1 -Proyecto smartprop2-0
param([Parameter(Mandatory = $true)][string]$Proyecto)

$ErrorActionPreference = "Stop"
$region = "southamerica-west1"
$cuenta = "sp2-motor@$Proyecto.iam.gserviceaccount.com"

function Ejecutar([string]$descripcion, [scriptblock]$comando) {
  Write-Host "`n== $descripcion" -ForegroundColor Cyan
  $salida = & $comando
  if ($LASTEXITCODE -ne 0) { throw "Falló: $descripcion" }
  $salida
}

Ejecutar "Proyecto $Proyecto" { gcloud config set project $Proyecto } | Out-Null

# La cuenta del motor ya construye imágenes; para desplegar necesita administrar Cloud Run y actuar como sí misma.
Ejecutar "Dando permisos de despliegue a la cuenta del motor" {
  gcloud projects add-iam-policy-binding $Proyecto --member "serviceAccount:$cuenta" `
    --role roles/run.admin --condition None --quiet > $null
  gcloud iam service-accounts add-iam-policy-binding $cuenta --member "serviceAccount:$cuenta" `
    --role roles/iam.serviceAccountUser --quiet > $null
} | Out-Null

$conexion = Ejecutar "Buscando la conexión con GitHub" {
  gcloud builds connections list --region $region --format "value(name)"
} | Select-Object -First 1
if (-not $conexion) { throw "No hay conexión con GitHub en ${region}: créala primero en la consola de Cloud Build (ver arriba)." }
$conexion = ($conexion -split "/")[-1]

$repo = Ejecutar "Buscando el repositorio vinculado" {
  gcloud builds repositories list --connection $conexion --region $region --format "value(name)"
} | Where-Object { $_ -match "SP2" } | Select-Object -First 1
if (-not $repo) { throw "La conexión $conexion no tiene vinculado el repositorio SP2.0: vincúlalo en la consola." }
$repo = ($repo -split "/")[-1]

# Cambios solo de la web (los publica Vercel) o de documentación no redespliegan el motor.
$ErrorActionPreference = "Continue"
gcloud builds triggers describe sp2-motor-main --region $region *> $null
$existe = $LASTEXITCODE -eq 0
$ErrorActionPreference = "Stop"
if (-not $existe) {
  Ejecutar "Creando el disparador sp2-motor-main" {
    gcloud builds triggers create github --name sp2-motor-main --region $region `
      --repository "projects/$Proyecto/locations/$region/connections/$conexion/repositories/$repo" `
      --branch-pattern '^main$' --build-config cloudbuild.motor.yaml `
      --service-account "projects/$Proyecto/serviceAccounts/$cuenta" `
      --ignored-files 'src/app/**,src/components/**,src/middleware.ts,docs/**,**/*.md,public/**'
  }
}
Write-Host "`nListo: desde ahora cada cambio del motor fusionado en main se despliega solo." -ForegroundColor Green
Write-Host "Puedes ver cada despliegue en https://console.cloud.google.com/cloud-build/builds;region=${region}?project=${Proyecto}"

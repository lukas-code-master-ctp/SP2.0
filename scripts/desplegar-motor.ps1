# Despliega el motor de obtención en Google Cloud Run, Santiago (southamerica-west1).
# Uso (en PowerShell, dentro de la carpeta del proyecto, con la CLI de Google Cloud instalada y sesión iniciada):
#   powershell -ExecutionPolicy Bypass -File scripts\desplegar-motor.ps1 -Proyecto <id-del-proyecto>
# Toma las variables del .env local, construye la imagen en Cloud Build y deja el servicio sp2-motor corriendo.
param([Parameter(Mandatory = $true)][string]$Proyecto)

$ErrorActionPreference = "Stop"
$region = "southamerica-west1"
$imagen = "$region-docker.pkg.dev/$Proyecto/sp2/motor"

function Ejecutar([string]$descripcion, [scriptblock]$comando) {
  Write-Host "`n== $descripcion" -ForegroundColor Cyan
  & $comando
  if ($LASTEXITCODE -ne 0) { throw "Falló: $descripcion" }
}

if (-not (Test-Path .env)) { throw "No encuentro el .env: ejecuta el script desde la carpeta del proyecto." }

# Variables que necesita el motor (sin imprimir sus valores).
$claves = "DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_BUCKET", "EMAIL_PROVIDER",
  "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "COMPANY_NAME", "COMPANY_RUT", "COMPANY_EMAIL",
  "PROXY_CL_URL", "PROXY_CL_DOCS"
$vars = @{}
foreach ($linea in Get-Content .env) {
  # KEY="valor"  # comentario   |   KEY=valor
  if ($linea -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(?:"([^"]*)"|([^#]*?))\s*(#.*)?$') {
    $vars[$Matches[1]] = if ($null -ne $Matches[2]) { $Matches[2] } else { $Matches[3] }
  }
}
foreach ($k in "DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") {
  if (-not $vars[$k]) { throw "Falta $k en el .env" }
}
$vars["APP_URL"] = "https://sp-2-0.vercel.app"
$vars["WORKER_CONCURRENCY"] = "3"
$yaml = foreach ($k in $claves + "APP_URL", "WORKER_CONCURRENCY") {
  if ($vars[$k]) { "${k}: '" + $vars[$k].Replace("'", "''") + "'" }
}
[IO.File]::WriteAllLines((Join-Path (Get-Location) "motor.env.yaml"), $yaml, (New-Object Text.UTF8Encoding $false))

try {
  Ejecutar "Proyecto $Proyecto" { gcloud config set project $Proyecto }
  Ejecutar "Activando servicios (la primera vez tarda un poco)" {
    gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com iam.googleapis.com
  }
  # Con "Stop", PowerShell 5 trata como error lo que gcloud escribe en stderr; aquí solo miramos el código de salida.
  $ErrorActionPreference = "Continue"
  gcloud artifacts repositories describe sp2 --location $region *> $null
  $existe = $LASTEXITCODE -eq 0
  $ErrorActionPreference = "Stop"
  if (-not $existe) {
    Ejecutar "Creando el repositorio de imágenes" {
      gcloud artifacts repositories create sp2 --repository-format=docker --location=$region
    }
  }
  # Cuenta propia para construir y correr el motor: en proyectos nuevos la cuenta por defecto de Cloud Build
  # no trae permisos y el build falla con PERMISSION_DENIED.
  $cuenta = "sp2-motor@$Proyecto.iam.gserviceaccount.com"
  $ErrorActionPreference = "Continue"
  gcloud iam service-accounts describe $cuenta *> $null
  $existe = $LASTEXITCODE -eq 0
  $ErrorActionPreference = "Stop"
  if (-not $existe) {
    Ejecutar "Creando la cuenta de servicio sp2-motor" {
      gcloud iam service-accounts create sp2-motor --display-name "Motor SP2"
    }
  }
  Ejecutar "Dando permisos a la cuenta de servicio" {
    gcloud projects add-iam-policy-binding $Proyecto --member "serviceAccount:$cuenta" `
      --role roles/cloudbuild.builds.builder --condition None --quiet > $null
  }
  if (-not $existe) { Start-Sleep -Seconds 30 } # los permisos nuevos tardan en aplicarse
  Ejecutar "Construyendo la imagen del motor (unos minutos)" {
    gcloud builds submit --region $region --service-account "projects/$Proyecto/serviceAccounts/$cuenta" `
      --config cloudbuild.worker.yaml --substitutions "_IMAGE=$imagen" .
  }
  Ejecutar "Desplegando sp2-motor en Santiago" {
    gcloud run deploy sp2-motor --image $imagen --region $region --no-allow-unauthenticated `
      --no-cpu-throttling --min-instances 1 --max-instances 1 --cpu 2 --memory 4Gi `
      --env-vars-file motor.env.yaml --service-account $cuenta
  }
  Write-Host "`nListo: el motor quedó corriendo en Cloud Run (sp2-motor, $region)." -ForegroundColor Green
  Write-Host "Ya puedes cerrar el worker de tu PC (Ctrl+C)."
} finally {
  Remove-Item motor.env.yaml -ErrorAction SilentlyContinue
}

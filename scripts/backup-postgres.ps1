param(
  [string]$OutputDirectory = "./backups",
  [int]$RetentionDays = 14,
  [string]$DatabaseUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }),
  [string]$DatabaseName = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "plano_pneumatic" })
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $OutputDirectory "plano-pneumatic-$timestamp.sql"

docker compose exec -T postgres pg_dump -U $DatabaseUser -d $DatabaseName --format=plain --no-owner --no-privileges | Out-File -FilePath $file -Encoding utf8
Get-ChildItem -Path $OutputDirectory -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force
Write-Output "Backup criado em $file"

param(
  [Parameter(Mandatory = $true)]
  [string]$SourceAccount,

  [Parameter(Mandatory = $true)]
  [string]$AdminPublicKey,

  [Parameter(Mandatory = $true)]
  [string]$FeeRecipientPublicKey,

  [int]$PlatformFeeBps = 50,

  [string]$Network = "testnet"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$contractsRoot = Join-Path $repoRoot "contracts"
$deploymentDir = Join-Path $contractsRoot "deployments"
$deploymentEnv = Join-Path $deploymentDir "testnet.latest.env"

Push-Location $contractsRoot
try {
  Write-Host "Building Soroban contracts..."
  stellar contract build

  $invoiceWasm = "target\wasm32v1-none\release\invoice_registry.wasm"
  $escrowWasm = "target\wasm32v1-none\release\payment_escrow.wasm"

  Write-Host "Deploying invoice-registry..."
  $invoiceRegistryContractId = (
    stellar contract deploy `
      --wasm $invoiceWasm `
      --source-account $SourceAccount `
      --network $Network `
      --alias lumorapay-invoice-registry
  ).Trim()

  Write-Host "Initializing invoice-registry..."
  stellar contract invoke `
    --id $invoiceRegistryContractId `
    --source-account $SourceAccount `
    --network $Network `
    -- `
    initialize `
    --admin $AdminPublicKey

  Write-Host "Deploying payment-escrow..."
  $paymentEscrowContractId = (
    stellar contract deploy `
      --wasm $escrowWasm `
      --source-account $SourceAccount `
      --network $Network `
      --alias lumorapay-payment-escrow
  ).Trim()

  Write-Host "Initializing payment-escrow..."
  stellar contract invoke `
    --id $paymentEscrowContractId `
    --source-account $SourceAccount `
    --network $Network `
    -- `
    initialize `
    --admin $AdminPublicKey `
    --fee-recipient $FeeRecipientPublicKey `
    --platform-fee-bps $PlatformFeeBps

  New-Item -ItemType Directory -Force -Path $deploymentDir | Out-Null
  @(
    "INVOICE_REGISTRY_CONTRACT_ID=$invoiceRegistryContractId"
    "PAYMENT_ESCROW_CONTRACT_ID=$paymentEscrowContractId"
    "VITE_INVOICE_REGISTRY_CONTRACT_ID=$invoiceRegistryContractId"
    "VITE_PAYMENT_ESCROW_CONTRACT_ID=$paymentEscrowContractId"
  ) | Set-Content -Path $deploymentEnv -Encoding ASCII

  Write-Host ""
  Write-Host "Deployment complete."
  Write-Host "Invoice Registry: $invoiceRegistryContractId"
  Write-Host "Payment Escrow:   $paymentEscrowContractId"
  Write-Host "Saved env output: $deploymentEnv"
}
finally {
  Pop-Location
}

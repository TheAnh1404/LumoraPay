param(
  [string]$ApiBaseUrl,
  [string]$AccessToken,
  [string]$FrontendUrl,
  [string]$GithubRepoUrl
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Name,
    [ValidateSet("PASS", "WARN", "FAIL")]
    [string]$Status,
    [string]$Detail
  )

  $script:checks.Add([pscustomobject]@{
    Name = $Name
    Status = $Status
    Detail = $Detail
  }) | Out-Null
}

function Test-RequiredFile {
  param(
    [string]$Name,
    [string]$RelativePath
  )

  $path = Join-Path $repoRoot $RelativePath
  if (Test-Path $path) {
    Add-Check $Name "PASS" $RelativePath
  } else {
    Add-Check $Name "FAIL" "Missing $RelativePath"
  }
}

function Read-EnvFileValue {
  param(
    [string]$Path,
    [string]$Key
  )

  if (-not (Test-Path $Path)) {
    return ""
  }

  $line = Get-Content $Path | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if (-not $line) {
    return ""
  }

  return ($line -replace "^$Key=", "").Trim()
}

function Get-GitHubRepoParts {
  param([string]$RepositoryUrl)

  if (-not $RepositoryUrl) {
    return $null
  }

  if ($RepositoryUrl -match "github\.com[:/](?<owner>[^/]+)/(?<repo>[^/.]+)(\.git)?$") {
    return @{
      Owner = $Matches.owner
      Repo = $Matches.repo
    }
  }

  return $null
}

Push-Location $repoRoot
try {
  Test-RequiredFile "CI workflow" ".github/workflows/ci.yml"
  Test-RequiredFile "Production runbook" "docs/17_LEVEL4_PRODUCTION_MVP_RUNBOOK.md"
  Test-RequiredFile "Freighter E2E checklist" "docs/14_FREIGHTER_E2E_CHECKLIST.md"
  Test-RequiredFile "Backend env example" "backend/.env.example"
  Test-RequiredFile "Frontend env example" "frontend/.env.example"
  Test-RequiredFile "Invoice registry contract" "contracts/contracts/invoice-registry/src/lib.rs"
  Test-RequiredFile "Payment escrow contract" "contracts/contracts/payment-escrow/src/lib.rs"

  try {
    $commitCount = [int](& git rev-list --count HEAD)
    if ($commitCount -ge 15) {
      Add-Check "Commit count" "PASS" "$commitCount commits"
    } else {
      Add-Check "Commit count" "FAIL" "$commitCount commits; 15+ required"
    }
  } catch {
    Add-Check "Commit count" "FAIL" "Unable to read git history"
  }

  $remote = (& git config --get remote.origin.url) 2>$null
  $repoCandidate = if ($GithubRepoUrl) { $GithubRepoUrl } else { $remote }
  if (-not $repoCandidate) {
    Add-Check "Public GitHub repo" "FAIL" "No GitHub repository URL configured"
  } else {
    $repoParts = Get-GitHubRepoParts $repoCandidate
    if (-not $repoParts) {
      Add-Check "Public GitHub repo" "FAIL" "Repository URL is not GitHub: $repoCandidate"
    } else {
      try {
        $repoApi = "https://api.github.com/repos/$($repoParts.Owner)/$($repoParts.Repo)"
        $repoInfo = Invoke-RestMethod -Uri $repoApi -Headers @{ "User-Agent" = "LumoraPay-MVP-Check" } -TimeoutSec 15
        if ($repoInfo.private -eq $false) {
          Add-Check "Public GitHub repo" "PASS" $repoInfo.html_url
        } else {
          Add-Check "Public GitHub repo" "FAIL" "$repoCandidate is private"
        }
      } catch {
        Add-Check "Public GitHub repo" "WARN" "Unable to verify public access: $repoCandidate"
      }
    }
  }

  $deploymentEnv = Join-Path $repoRoot "contracts/deployments/testnet.latest.env"
  $invoiceContractId = Read-EnvFileValue $deploymentEnv "INVOICE_REGISTRY_CONTRACT_ID"
  $escrowContractId = Read-EnvFileValue $deploymentEnv "PAYMENT_ESCROW_CONTRACT_ID"
  if (-not $invoiceContractId) {
    $invoiceContractId = $env:INVOICE_REGISTRY_CONTRACT_ID
  }
  if (-not $escrowContractId) {
    $escrowContractId = $env:PAYMENT_ESCROW_CONTRACT_ID
  }

  if ($invoiceContractId -and $escrowContractId) {
    Add-Check "Testnet contract IDs" "PASS" "Invoice registry and payment escrow IDs found"
  } else {
    Add-Check "Testnet contract IDs" "FAIL" "Run scripts/deploy-contracts-testnet.ps1 and configure env"
  }

  if ($FrontendUrl) {
    try {
      $frontendResponse = Invoke-WebRequest -UseBasicParsing $FrontendUrl -TimeoutSec 15
      Add-Check "Production frontend URL" "PASS" "HTTP $($frontendResponse.StatusCode): $FrontendUrl"
    } catch {
      Add-Check "Production frontend URL" "FAIL" "Unable to reach $FrontendUrl"
    }
  } else {
    Add-Check "Production frontend URL" "WARN" "Pass -FrontendUrl after deployment"
  }

  if ($ApiBaseUrl) {
    $api = $ApiBaseUrl.TrimEnd("/")
    try {
      $readiness = Invoke-RestMethod -Uri "$api/health/readiness" -Method Get -TimeoutSec 15
      if ($readiness.status -eq "UP") {
        Add-Check "Backend readiness" "PASS" "$api/health/readiness"
      } else {
        Add-Check "Backend readiness" "FAIL" ($readiness | ConvertTo-Json -Compress -Depth 8)
      }
    } catch {
      Add-Check "Backend readiness" "FAIL" "Unable to reach $api/health/readiness"
    }

    if ($AccessToken) {
      try {
        $headers = @{ Authorization = "Bearer $AccessToken" }
        $evidence = Invoke-RestMethod -Uri "$api/pilot/evidence" -Method Get -Headers $headers -TimeoutSec 15
        $totals = $evidence.overview.totals
        $ready = $evidence.overview.readiness
        if ($ready.usersOnboarded -and $ready.walletProofCaptured -and $ready.feedbackCollected) {
          Add-Check "Pilot evidence" "PASS" "wallets=$($totals.verifiedWallets), proofs=$($totals.uniqueInteractedWallets), feedback=$($totals.feedbackResponses)"
        } else {
          Add-Check "Pilot evidence" "FAIL" "wallets=$($totals.verifiedWallets), proofs=$($totals.uniqueInteractedWallets), feedback=$($totals.feedbackResponses)"
        }
      } catch {
        Add-Check "Pilot evidence" "FAIL" "Unable to fetch $api/pilot/evidence"
      }
    } else {
      Add-Check "Pilot evidence" "WARN" "Pass -AccessToken to verify 10-user wallet and feedback evidence"
    }
  } else {
    Add-Check "Backend readiness" "WARN" "Pass -ApiBaseUrl after deployment"
    Add-Check "Pilot evidence" "WARN" "Pass -ApiBaseUrl and -AccessToken after pilot"
  }

  $checks | Format-Table -AutoSize

  if (($checks | Where-Object { $_.Status -eq "FAIL" }).Count -gt 0) {
    exit 1
  }
}
finally {
  Pop-Location
}

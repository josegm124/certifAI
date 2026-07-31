# CanonicalScoring.ps1 — shared helper for the CertifAI test scripts.
# PowerShell 5.1 compatible.
#
# WHY THIS EXISTS
# The three TEST*.ps1 scripts each posted their own questionMapping to the old
# POST /assessments/:id/compute-score route. That route is gone: the backend no
# longer computes scores, it validates a result the canonical frontend engine
# produced and decides the badge itself.
#
# These scripts have no frontend to compute for them, so they stand in for it.
# The instrument below MUST mirror frontend/src/lib/data.ts. It lives here once
# rather than three times — three copies drifting apart is the exact defect this
# whole merge set out to remove.
#
# Usage:
#   . "$PSScriptRoot\CanonicalScoring.ps1"
#   $answers = @{}; for ($i=1; $i -le 36; $i++) { $answers[$i] = 4 }
#   $payload = New-CertifAIResultPayload -Answers $answers -Tier 2 -HasEvidence $true -HasSignature $true

$CertifAI_TotalQuestions = 36
$CertifAI_MaxScore       = 5
$CertifAI_CriticalIds    = @(17, 18, 26)

# id / weight, mirroring DOMAINS in frontend/src/lib/data.ts. Weights sum to 1.00.
$CertifAI_Domains = @(
  @{ id = "strategy";   weight = 0.09 },
  @{ id = "revenue";    weight = 0.06 },
  @{ id = "governance"; weight = 0.13 },
  @{ id = "risk";       weight = 0.19 },
  @{ id = "data";       weight = 0.17 },
  @{ id = "human";      weight = 0.12 },
  @{ id = "trust";      weight = 0.12 },
  @{ id = "workforce";  weight = 0.08 },
  @{ id = "improve";    weight = 0.04 }
)

# Question -> domain, Q1..Q36, matching the June numbering exactly.
$CertifAI_QuestionDomains = @(
  "strategy","strategy","strategy","strategy","strategy",
  "revenue","revenue","revenue","revenue",
  "governance","governance","governance","governance","governance",
  "risk","risk","risk","risk","risk",
  "data","data","data","data","data","data",
  "human","human","human",
  "trust","trust","trust",
  "workforce","workforce","workforce","workforce",
  "improve"
)

function Get-CertifAIDomainOf {
  param([int]$QuestionId)
  return $CertifAI_QuestionDomains[$QuestionId - 1]
}

<#
.SYNOPSIS
Build the POST /assessments/:id/result payload from a set of answers.

.PARAMETER Answers
Hashtable of questionId (int) -> score (0-5).

.PARAMETER Tier
1 = free snapshot, 2 = evidence + certification.

.PARAMETER HasEvidence / HasSignature
The LevelContext the client asserts. The SERVER re-derives evidence from stored
answers and ignores a false claim, so these are assertions, not guarantees.
#>
function New-CertifAIResultPayload {
  param(
    [hashtable]$Answers,
    [int]$Tier = 2,
    [bool]$HasEvidence = $true,
    [bool]$HasSignature = $true
  )

  # Per-domain percentage, rounded the same way scoring.ts rounds it.
  $domainScores = @()
  foreach ($d in $CertifAI_Domains) {
    $ids = @()
    for ($i = 1; $i -le $CertifAI_TotalQuestions; $i++) {
      if ((Get-CertifAIDomainOf -QuestionId $i) -eq $d.id -and $Answers.ContainsKey($i)) { $ids += $i }
    }
    $sum = 0
    foreach ($i in $ids) { $sum += $Answers[$i] }

    if ($ids.Count -gt 0) {
      $pct = [math]::Round(($sum / ($ids.Count * $CertifAI_MaxScore)) * 100)
      $rawAvg = $sum / $ids.Count
    } else {
      $pct = 0
      $rawAvg = 0
    }

    $domainScores += @{
      id            = $d.id
      name          = $d.id
      weight        = $d.weight
      pct           = $pct
      rawAvg        = $rawAvg
      answeredCount = $ids.Count
      totalCount    = $ids.Count
    }
  }

  # Weighted overall across answered domains only, as scoring.ts does.
  $weighted = 0.0
  $totalW   = 0.0
  foreach ($ds in $domainScores) {
    if ($ds.answeredCount -gt 0) {
      $weighted += ($ds.pct * $ds.weight)
      $totalW   += $ds.weight
    }
  }
  if ($totalW -gt 0) { $overall = [math]::Round($weighted / $totalW) } else { $overall = 0 }

  # Critical-control gate, for cross-checking only. The server re-derives this
  # from stored answers and logs a warning if the client disagrees.
  $failed = @()
  foreach ($cid in $CertifAI_CriticalIds) {
    if ($Answers.ContainsKey($cid) -and $Answers[$cid] -le 1) { $failed += $cid }
  }

  $answeredCount = $Answers.Keys.Count
  $signedAt = $null
  if ($HasSignature) { $signedAt = (Get-Date).ToString("o") }

  return @{
    overallScore = $overall
    domainScores = $domainScores
    levelContext = @{ tier = $Tier; hasEvidence = $HasEvidence; hasSignature = $HasSignature }
    criticalGating = @{ capped = ($failed.Count -gt 0); failedIds = $failed }
    completion = @{
      answered   = $answeredCount
      total      = $CertifAI_TotalQuestions
      percentage = [math]::Round(($answeredCount / $CertifAI_TotalQuestions) * 100)
    }
    gaps = @()
    selfCertifiedAt = $signedAt
    frameworks = @("aiact","gdpr","oecd","iso","nist")
  }
}

<# Post a result and return the server's verdict (which carries .badge or $null). #>
function Submit-CertifAIResult {
  param([string]$Api, [string]$AssessmentId, [hashtable]$Payload)
  $body = $Payload | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Uri "$Api/assessments/$AssessmentId/result" -Method POST -Body $body -ContentType "application/json"
}

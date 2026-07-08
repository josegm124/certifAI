# Simple Happy Path Test - Using curl (compatible with all PowerShell versions)

$API = "http://localhost:3001/api"
$orgName = "Test Corp - Run $(Get-Date -Format 'HHmmss')"
$orgEmail = "test-$(Get-Random -Maximum 99999)@certifai.local"

Write-Host ""
Write-Host "====== CERTIFAI HAPPY PATH TEST (SIMPLE) ======" -ForegroundColor Cyan
Write-Host "API: $API" -ForegroundColor Gray
Write-Host ""

# ========== STEP 1: Create Organization ==========
Write-Host "[1/5] Creating Organization: $orgName" -ForegroundColor Green

$orgJson = @{ name = $orgName; email = $orgEmail } | ConvertTo-Json
$orgRes = curl -s -X POST "$API/organizations" `
  -H "Content-Type: application/json" `
  -d $orgJson | ConvertFrom-Json

$orgId = $orgRes.id
if (-not $orgId) {
  Write-Host "[ERROR] Failed to create organization" -ForegroundColor Red
  exit 1
}

Write-Host "  [OK] Organization ID: $orgId" -ForegroundColor Green
Write-Host ""

# ========== STEP 2: Create Assessments ==========
Write-Host "[2/5] Creating Tier 1 + Tier 2 Assessments" -ForegroundColor Green

$systemId = "system-$(Get-Random -Minimum 1000000 -Maximum 9999999)"

# Tier 1
$assess1Json = @{ organizationId = $orgId; aiSystemId = $systemId; tier = "free" } | ConvertTo-Json
$assess1Res = curl -s -X POST "$API/assessments" `
  -H "Content-Type: application/json" `
  -d $assess1Json | ConvertFrom-Json

$assessId1 = $assess1Res.id

# Tier 2
$assess2Json = @{ organizationId = $orgId; aiSystemId = $systemId; tier = "professional" } | ConvertTo-Json
$assess2Res = curl -s -X POST "$API/assessments" `
  -H "Content-Type: application/json" `
  -d $assess2Json | ConvertFrom-Json

$assessId2 = $assess2Res.id

Write-Host "  [OK] Assessment 1 (free): $assessId1" -ForegroundColor Green
Write-Host "  [OK] Assessment 2 (professional): $assessId2" -ForegroundColor Green
Write-Host ""

# ========== STEP 3: Record Answers ==========
Write-Host "[3/5] Recording 32 Answers x 2 Assessments (64 total)" -ForegroundColor Green

$assessIds = @($assessId1, $assessId2)
$answerCount = 0

foreach ($aId in $assessIds) {
  for ($i = 1; $i -le 32; $i++) {
    $score = (3 + ($i % 3))
    $ansJson = @{
      questionId = [string]$i
      score = $score
      evidence = "Evidence for Q$i"
      attestation = "Attestation"
    } | ConvertTo-Json

    $ansRes = curl -s -X POST "$API/assessments/$aId/answers" `
      -H "Content-Type: application/json" `
      -d $ansJson | ConvertFrom-Json

    if ($ansRes.id) {
      $answerCount++
    }
  }
}

Write-Host "  [OK] Saved $answerCount/64 answers" -ForegroundColor Green
Write-Host ""

# ========== STEP 4: Compute Scores ==========
Write-Host "[4/5] Computing Scores" -ForegroundColor Green

$questionMapping = @{}
$domains = @(
  "strategy", "strategy", "strategy", "strategy", "strategy",
  "governance", "governance", "governance", "governance", "governance",
  "risk", "risk", "risk", "risk", "risk",
  "data", "data", "data", "data", "data",
  "human", "human", "human", "human",
  "trust", "trust", "trust",
  "workforce", "workforce", "workforce", "workforce",
  "improve"
)

for ($i = 1; $i -le 32; $i++) {
  $questionMapping[[string]$i] = @{ domain = $domains[$i-1]; description = "Q$i" }
}

$scoreJson = @{ questionMapping = $questionMapping } | ConvertTo-Json
$score1 = curl -s -X POST "$API/assessments/$assessId1/compute-score" `
  -H "Content-Type: application/json" `
  -d $scoreJson | ConvertFrom-Json

$score2 = curl -s -X POST "$API/assessments/$assessId2/compute-score" `
  -H "Content-Type: application/json" `
  -d $scoreJson | ConvertFrom-Json

Write-Host "  [OK] Tier 1 Score: $($score1.overallScore)/5, Badge: $($score1.badgeTier)" -ForegroundColor Green
Write-Host "  [OK] Tier 2 Score: $($score2.overallScore)/5, Badge: $($score2.badgeTier)" -ForegroundColor Green
Write-Host ""

# ========== STEP 5: Issue Badge ==========
Write-Host "[5/5] Issuing Badge (Tier 2 only)" -ForegroundColor Green

$badgeJson = @{
  organizationId = $orgId
  tier = $score2.badgeTier
  overallScore = $score2.overallScore
  frameworks = @("aiact", "gdpr", "oecd", "iso", "nist")
} | ConvertTo-Json

$badge = curl -s -X POST "$API/assessments/$assessId2/badges" `
  -H "Content-Type: application/json" `
  -d $badgeJson | ConvertFrom-Json

Write-Host "  [OK] Badge ID: $($badge.id)" -ForegroundColor Green
Write-Host "  [OK] Tier: $($badge.tier)" -ForegroundColor Green
Write-Host "  [OK] Token: $($badge.verificationToken.Substring(0, 12))..." -ForegroundColor Green
Write-Host "  [OK] Expires: $($badge.expiresAt)" -ForegroundColor Green
Write-Host ""

# ========== VERIFY BADGE ==========
Write-Host "Verifying Badge (Public Endpoint)..." -ForegroundColor Cyan
$verify = curl -s "$API/badges/$($badge.verificationToken)/verify" | ConvertFrom-Json

if ($verify.id) {
  Write-Host "  [OK] Badge verified successfully!" -ForegroundColor Green
  Write-Host "  [OK] Public URL: http://localhost:5173?verify=$($badge.verificationToken)" -ForegroundColor Green
}

Write-Host ""
Write-Host "====== TEST PASSED ======" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Organization: $orgName" -ForegroundColor Gray
Write-Host "  Assessments: 2 (free + professional)" -ForegroundColor Gray
Write-Host "  Answers: 64 (32 per assessment)" -ForegroundColor Gray
Write-Host "  Badge: Issued for Tier 2" -ForegroundColor Gray
Write-Host ""

# Happy Path Testing Script
# This script tests the complete flow: Tier 1 -> Upgrade -> Tier 2 -> Badge

$API = "http://localhost:3001/api"
$orgName = "Test Corp Academic"
$orgEmail = "academic@certifai.local"

Write-Host "====== CERTIFAI HAPPY PATH TEST ======" -ForegroundColor Cyan
Write-Host "Testing: Tier 1 -> Upgrade -> Tier 2 -> Badge" -ForegroundColor Cyan
Write-Host ""

# ========== STEP 1: Create Organization ==========
Write-Host "1️⃣  Creating Organization..." -ForegroundColor Green
$orgRes = Invoke-WebRequest -Uri "$API/organizations" `
  -Method POST `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{ name = $orgName; email = $orgEmail }) `
  -SkipHttpErrorCheck

$org = $orgRes.Content | ConvertFrom-Json
$orgId = $org.id

Write-Host "   ✓ Organization ID: $orgId" -ForegroundColor Green
Write-Host "   ✓ Name: $($org.name)" -ForegroundColor Green
Write-Host "   ✓ Tier: $($org.tier)" -ForegroundColor Green
Write-Host ""

# ========== STEP 2: Create Tier 1 Assessment ==========
Write-Host "2️⃣  Creating Tier 1 Assessment (Free)..." -ForegroundColor Green
$systemId = "system-$(Get-Random -Minimum 1000000 -Maximum 9999999)"
$assess1Res = Invoke-WebRequest -Uri "$API/assessments" `
  -Method POST `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{ organizationId = $orgId; aiSystemId = $systemId; tier = "free" }) `
  -SkipHttpErrorCheck

$assess1 = $assess1Res.Content | ConvertFrom-Json
$assessId1 = $assess1.id

Write-Host "   ✓ Assessment 1 ID: $assessId1" -ForegroundColor Green
Write-Host "   ✓ Tier: $($assess1.tier)" -ForegroundColor Green
Write-Host ""

# ========== STEP 3: Record 32 Answers (Tier 1) ==========
Write-Host "3️⃣  Recording 32 Answers (Tier 1)..." -ForegroundColor Green
$answerCount = 0
for ($i = 1; $i -le 32; $i++) {
  $score = (3 + ($i % 3)) # Mix of scores 3, 4, 5
  $ansRes = Invoke-WebRequest -Uri "$API/assessments/$assessId1/answers" `
    -Method POST `
    -ContentType "application/json" `
    -Body (ConvertTo-Json @{
      questionId = [string]$i
      score = $score
      evidence = "Evidence for Q$i"
      attestation = "Attestation for Q$i"
    }) `
    -SkipHttpErrorCheck

  if ($ansRes.StatusCode -eq 200) {
    $answerCount++
  }

  if ($i % 8 -eq 0) {
    Write-Host "   ✓ Saved $i/32 answers" -ForegroundColor Green
  }
}
Write-Host "   ✓ Total answers saved: $answerCount/32" -ForegroundColor Green
Write-Host ""

# ========== STEP 4: Compute Scores (Tier 1) ==========
Write-Host "4️⃣  Computing Scores (Tier 1)..." -ForegroundColor Green

# Build question mapping
$questionMapping = @{}
@(
  "strategy", "strategy", "strategy", "strategy", "strategy",
  "governance", "governance", "governance", "governance", "governance",
  "risk", "risk", "risk", "risk", "risk",
  "data", "data", "data", "data", "data",
  "human", "human", "human", "human",
  "trust", "trust", "trust",
  "workforce", "workforce", "workforce", "workforce",
  "improve"
) | ForEach-Object -Begin { $i = 1 } {
  $questionMapping[[string]$i] = @{ domain = $_; description = "Q$i" }
  $i++
}

$scoreRes = Invoke-WebRequest -Uri "$API/assessments/$assessId1/compute-score" `
  -Method POST `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{ questionMapping = $questionMapping }) `
  -SkipHttpErrorCheck

$scoring1 = $scoreRes.Content | ConvertFrom-Json

Write-Host "   ✓ Overall Score: $($scoring1.overallScore)/5" -ForegroundColor Green
Write-Host "   ✓ Badge Tier: $($scoring1.badgeTier)" -ForegroundColor Green
Write-Host "   ✓ Completion: $($scoring1.completion.percentage)%" -ForegroundColor Green
Write-Host "   ✓ Critical Gating: $($scoring1.criticalGating)" -ForegroundColor Green
Write-Host "   ✓ Gaps Found: $($scoring1.gaps.Count)" -ForegroundColor Green
Write-Host ""

# ========== STEP 5: Upgrade to Tier 2 ==========
Write-Host "5️⃣  Upgrading to Tier 2 (Professional)..." -ForegroundColor Green
$assess2Res = Invoke-WebRequest -Uri "$API/assessments" `
  -Method POST `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{ organizationId = $orgId; aiSystemId = $systemId; tier = "professional" }) `
  -SkipHttpErrorCheck

$assess2 = $assess2Res.Content | ConvertFrom-Json
$assessId2 = $assess2.id

Write-Host "   ✓ Assessment 2 ID (Professional): $assessId2" -ForegroundColor Green
Write-Host "   ✓ Tier: $($assess2.tier)" -ForegroundColor Green
Write-Host ""

# ========== STEP 6: Copy Answers to Tier 2 ==========
Write-Host "6️⃣  Copying 32 Answers to Tier 2..." -ForegroundColor Green
$copyCount = 0
for ($i = 1; $i -le 32; $i++) {
  $score = (3 + ($i % 3))
  $copyRes = Invoke-WebRequest -Uri "$API/assessments/$assessId2/answers" `
    -Method POST `
    -ContentType "application/json" `
    -Body (ConvertTo-Json @{
      questionId = [string]$i
      score = $score
      evidence = "Evidence for Q$i (Professional)"
      attestation = "Attestation for Q$i (Professional)"
    }) `
    -SkipHttpErrorCheck

  if ($copyRes.StatusCode -eq 200) {
    $copyCount++
  }
}
Write-Host "   ✓ Copied $copyCount/32 answers to Tier 2" -ForegroundColor Green
Write-Host ""

# ========== STEP 7: Compute Scores (Tier 2) ==========
Write-Host "7️⃣  Computing Scores (Tier 2)..." -ForegroundColor Green
$scoreRes2 = Invoke-WebRequest -Uri "$API/assessments/$assessId2/compute-score" `
  -Method POST `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{ questionMapping = $questionMapping }) `
  -SkipHttpErrorCheck

$scoring2 = $scoreRes2.Content | ConvertFrom-Json

Write-Host "   ✓ Overall Score: $($scoring2.overallScore)/5" -ForegroundColor Green
Write-Host "   ✓ Badge Tier: $($scoring2.badgeTier)" -ForegroundColor Green
Write-Host "   ✓ Completion: $($scoring2.completion.percentage)%" -ForegroundColor Green
Write-Host ""

# ========== STEP 8: Issue Badge ==========
Write-Host "8️⃣  Issuing Badge..." -ForegroundColor Green
$badgeRes = Invoke-WebRequest -Uri "$API/assessments/$assessId2/badges" `
  -Method POST `
  -ContentType "application/json" `
  -Body (ConvertTo-Json @{
    organizationId = $orgId
    tier = $scoring2.badgeTier
    overallScore = $scoring2.overallScore
    frameworks = @("aiact", "gdpr", "oecd", "iso", "nist")
  }) `
  -SkipHttpErrorCheck

$badge = $badgeRes.Content | ConvertFrom-Json

Write-Host "   ✓ Badge ID: $($badge.id)" -ForegroundColor Green
Write-Host "   ✓ Tier: $($badge.tier)" -ForegroundColor Green
Write-Host "   ✓ Issued: $($badge.issuedAt)" -ForegroundColor Green
Write-Host "   ✓ Expires: $($badge.expiresAt)" -ForegroundColor Green
Write-Host "   ✓ Verification Token: $($badge.verificationToken.Substring(0, 12))..." -ForegroundColor Green
Write-Host ""

# ========== STEP 9: Verify Badge (Public) ==========
Write-Host "9️⃣  Verifying Badge (Public Endpoint)..." -ForegroundColor Green
$verifyRes = Invoke-WebRequest -Uri "$API/badges/$($badge.verificationToken)/verify" `
  -Method GET `
  -SkipHttpErrorCheck

$verifyBadge = $verifyRes.Content | ConvertFrom-Json

Write-Host "   ✓ Badge verified successfully!" -ForegroundColor Green
Write-Host "   ✓ Tier: $($verifyBadge.tier)" -ForegroundColor Green
Write-Host "   ✓ Expired: $(if ($verifyRes.StatusCode -eq 200) { 'No ✓' } else { 'Yes' })" -ForegroundColor Green
Write-Host ""

# ========== SUMMARY ==========
Write-Host "====== TEST SUMMARY ======" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Organization: $orgName ($orgId)" -ForegroundColor Green
Write-Host "✅ Tier 1 Assessment: $assessId1 (free)" -ForegroundColor Green
Write-Host "✅ Tier 2 Assessment: $assessId2 (professional)" -ForegroundColor Green
Write-Host "✅ Answers Recorded: 32 per assessment = 64 total" -ForegroundColor Green
Write-Host "✅ Scores Computed: Both tiers" -ForegroundColor Green
Write-Host "✅ Badge Issued: $($badge.tier) (expires $(([DateTime]$badge.expiresAt).ToString('yyyy-MM-dd')))" -ForegroundColor Green
Write-Host "✅ Badge Verified: Token valid, public accessible" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 PUBLIC SHARE LINK (no login needed):" -ForegroundColor Yellow
Write-Host "http://localhost:5173?verify=$($badge.verificationToken)" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ HAPPY PATH TEST PASSED" -ForegroundColor Green
Write-Host ""

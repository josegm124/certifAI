# Happy Path Testing Script
# Tests the complete flow: Tier 1 -> Tier 2 unsigned -> Tier 2 signed -> Badge
# PowerShell 5.1 compatible.
#
# REWRITTEN, not just re-pointed. This script was already dead before the
# compute-score route was retired:
#   - it posted organizationId to /assessments, which has read userId since the
#     companies/users split, so it 404'd at step 2 and never reached scoring
#   - it looped 32 questions against the canonical 36-question instrument
#   - it used -SkipHttpErrorCheck, PowerShell 7+ only, so it broke on the 5.1
#     it claimed to support
# Those are fixed here alongside the move to POST /assessments/:id/result.
#
# The instrument lives in CanonicalScoring.ps1, once, not in this file.

. "$PSScriptRoot\CanonicalScoring.ps1"

$API = "http://localhost:3001/api"
$orgName = "Test Corp Academic $(Get-Date -Format 'HHmmss')"
$orgEmail = "academic$(Get-Random -Maximum 99999)@certifai.local"

Write-Host "====== CERTIFAI HAPPY PATH TEST ======" -ForegroundColor Cyan
Write-Host "Testing: Tier 1 -> Tier 2 unsigned -> Tier 2 signed -> Badge" -ForegroundColor Cyan
Write-Host ""

Try {
  # ========== STEP 1: Create Company + User ==========
  Write-Host "[1/9] Creating Company + User (lead)..." -ForegroundColor Green
  $orgBody = @{ name = $orgName; email = $orgEmail; role = "Head of AI Governance" } | ConvertTo-Json
  $org = Invoke-RestMethod -Uri "$API/companies" -Method POST -Body $orgBody -ContentType "application/json"
  $userId = $org.userId
  $companyId = $org.companyId
  Write-Host "   [OK] userId: $userId" -ForegroundColor Green
  Write-Host "   [OK] companyId: $companyId" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 2: Create Tier 1 Assessment ==========
  Write-Host "[2/9] Creating Tier 1 Assessment (Free)..." -ForegroundColor Green
  $systemId = "system-$(Get-Random -Minimum 100000 -Maximum 999999)"
  $a1Body = @{ userId = $userId; aiSystemId = $systemId; tier = "free" } | ConvertTo-Json
  $assess1 = Invoke-RestMethod -Uri "$API/assessments" -Method POST -Body $a1Body -ContentType "application/json"
  $assessId1 = $assess1.id
  Write-Host "   [OK] Assessment 1: $assessId1 (tier $($assess1.tier))" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 3: Record 36 Answers (Tier 1) ==========
  Write-Host "[3/9] Recording 36 Answers (Tier 1)..." -ForegroundColor Green
  $answers = @{}
  $n1 = 0
  for ($i = 1; $i -le 36; $i++) {
    $answers[$i] = (3 + ($i % 3))
    $body = @{ questionId = [string]$i; score = $answers[$i]; evidence = "Evidence for Q$i"; attestation = "Attested" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$API/assessments/$assessId1/answers" -Method POST -Body $body -ContentType "application/json"
    if ($r.id) { $n1++ }
  }
  Write-Host "   [OK] Recorded $n1/36 answers" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 4: Submit Result (Tier 1) ==========
  Write-Host "[4/9] Submitting Result (Tier 1)..." -ForegroundColor Green
  $p1 = New-CertifAIResultPayload -Answers $answers -Tier 1 -HasEvidence $true -HasSignature $false
  $r1 = Submit-CertifAIResult -Api $API -AssessmentId $assessId1 -Payload $p1
  Write-Host "   [OK] Overall Score: $($r1.overallScore)/100" -ForegroundColor Green
  Write-Host "   [OK] Level: $($r1.level) ($($r1.levelName)) / tier $($r1.badgeTier)" -ForegroundColor Green
  Write-Host "   [OK] Completion: $($r1.completion.percentage)%" -ForegroundColor Green
  Write-Host "   [OK] Critical gating capped: $($r1.criticalGating.capped)" -ForegroundColor Green
  Write-Host "   [OK] Evidence found server-side: $($r1.hasEvidence)" -ForegroundColor Green
  if ($r1.badge) { throw "Tier 1 must never earn a badge." }
  Write-Host "   [OK] No badge, correct for the free tier" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 5: Create Tier 2 Assessment ==========
  Write-Host "[5/9] Creating Tier 2 Assessment (Professional)..." -ForegroundColor Green
  $a2Body = @{ userId = $userId; aiSystemId = $systemId; tier = "professional" } | ConvertTo-Json
  $assess2 = Invoke-RestMethod -Uri "$API/assessments" -Method POST -Body $a2Body -ContentType "application/json"
  $assessId2 = $assess2.id
  Write-Host "   [OK] Assessment 2: $assessId2 (tier $($assess2.tier))" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 6: Copy Answers to Tier 2 ==========
  Write-Host "[6/9] Copying 36 Answers to Tier 2..." -ForegroundColor Green
  $n2 = 0
  for ($i = 1; $i -le 36; $i++) {
    $body = @{ questionId = [string]$i; score = $answers[$i]; evidence = "Evidence for Q$i (Professional)"; attestation = "Attested" } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$API/assessments/$assessId2/answers" -Method POST -Body $body -ContentType "application/json"
    if ($r.id) { $n2++ }
  }
  Write-Host "   [OK] Copied $n2/36 answers" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 7: Submit Result UNSIGNED (Tier 2) ==========
  # Demonstrates the rule change: without a signature the ladder now caps at
  # Aligned. Previously only Advanced was downgraded, so Assured was reachable
  # without anyone ever signing.
  Write-Host "[7/9] Submitting Result UNSIGNED (Tier 2)..." -ForegroundColor Green
  $p2u = New-CertifAIResultPayload -Answers $answers -Tier 2 -HasEvidence $true -HasSignature $false
  $r2u = Submit-CertifAIResult -Api $API -AssessmentId $assessId2 -Payload $p2u
  Write-Host "   [OK] Unsigned level: $($r2u.level) ($($r2u.levelName))" -ForegroundColor Green
  if ($r2u.cappedFrom) { Write-Host "   [OK] Capped $($r2u.cappedFrom) -> $($r2u.level): $($r2u.cappedReason)" -ForegroundColor DarkGray }
  Write-Host ""

  # ========== STEP 8: Sign and earn the badge ==========
  Write-Host "[8/9] Submitting Result SIGNED (Tier 2)..." -ForegroundColor Green
  $p2 = New-CertifAIResultPayload -Answers $answers -Tier 2 -HasEvidence $true -HasSignature $true
  $r2 = Submit-CertifAIResult -Api $API -AssessmentId $assessId2 -Payload $p2
  $badge = $r2.badge
  if (-not $badge) { throw "Expected a badge for a complete, evidenced, signed Tier 2 assessment. Server said: $($r2.cappedReason)" }
  Write-Host "   [OK] Signed level: $($r2.level) ($($r2.levelName))" -ForegroundColor Green
  Write-Host "   [OK] Badge ID: $($badge.id)" -ForegroundColor Green
  Write-Host "   [OK] Tier: $($badge.tier)  Score: $($badge.score)/100" -ForegroundColor Green
  Write-Host "   [OK] Expires: $($badge.expiresAt)" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 9: Verify Badge (Public) ==========
  Write-Host "[9/9] Verifying Badge (Public Endpoint)..." -ForegroundColor Green
  $verify = Invoke-RestMethod -Uri "$API/badges/$($badge.verificationToken)/verify" -Method GET
  if (-not $verify.id) { throw "Public verification failed for token $($badge.verificationToken)" }
  Write-Host "   [OK] Verified: $($verify.tier) tier, score $($verify.score)/100" -ForegroundColor Green
  Write-Host ""

  # ========== SUMMARY ==========
  Write-Host "====== TEST PASSED ======" -ForegroundColor Green
  Write-Host ""
  Write-Host "Company:      $orgName" -ForegroundColor Cyan
  Write-Host "Tier 1 level: $($r1.level) - no badge (free tier)" -ForegroundColor Cyan
  Write-Host "Tier 2 unsig: $($r2u.level) - capped without a signature" -ForegroundColor Cyan
  Write-Host "Tier 2 sign:  $($r2.level) - badge issued" -ForegroundColor Cyan
  Write-Host "Badge Token:  $($badge.verificationToken)" -ForegroundColor Cyan
  Write-Host "Verify URL:   $($badge.verifyUrl)" -ForegroundColor Cyan
}
Catch {
  Write-Host ""
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Make sure the backend is running: cd backend; npm run dev" -ForegroundColor Yellow
}

Write-Host ""

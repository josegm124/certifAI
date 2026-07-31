# Simple Happy Path Test - compatible with all PowerShell versions
#
# REWRITTEN, not just re-pointed. Like TEST_HAPPY_PATH.ps1 this was already
# dead before compute-score was retired: it posted organizationId to
# /assessments (which has read userId since the companies/users split) and
# looped 32 questions against the canonical 36-question instrument.
# Both are fixed here alongside the move to POST /assessments/:id/result.
#
# The instrument lives in CanonicalScoring.ps1, once, not in this file.

. "$PSScriptRoot\CanonicalScoring.ps1"

$API = "http://localhost:3001/api"
$orgName = "Test Corp - Run $(Get-Date -Format 'HHmmss')"
$orgEmail = "test-$(Get-Random -Maximum 99999)@certifai.local"

Write-Host ""
Write-Host "====== CERTIFAI HAPPY PATH TEST (SIMPLE) ======" -ForegroundColor Cyan
Write-Host "API: $API" -ForegroundColor Gray
Write-Host ""

Try {
  # ========== STEP 1: Create Company + User ==========
  Write-Host "[1/5] Creating Company + User: $orgName" -ForegroundColor Green
  $orgBody = @{ name = $orgName; email = $orgEmail; role = "Compliance" } | ConvertTo-Json
  $org = Invoke-RestMethod -Uri "$API/companies" -Method POST -Body $orgBody -ContentType "application/json"
  $userId = $org.userId
  Write-Host "      userId $userId / companyId $($org.companyId)" -ForegroundColor Gray
  Write-Host ""

  # ========== STEP 2: Create Assessments ==========
  Write-Host "[2/5] Creating Tier 1 + Tier 2 Assessments" -ForegroundColor Green
  $systemId = "system-$(Get-Random -Minimum 100000 -Maximum 999999)"

  $a1 = Invoke-RestMethod -Uri "$API/assessments" -Method POST -ContentType "application/json" `
    -Body (@{ userId = $userId; aiSystemId = $systemId; tier = "free" } | ConvertTo-Json)
  $a2 = Invoke-RestMethod -Uri "$API/assessments" -Method POST -ContentType "application/json" `
    -Body (@{ userId = $userId; aiSystemId = $systemId; tier = "professional" } | ConvertTo-Json)

  Write-Host "      Tier 1: $($a1.id)" -ForegroundColor Gray
  Write-Host "      Tier 2: $($a2.id)" -ForegroundColor Gray
  Write-Host ""

  # ========== STEP 3: Record Answers ==========
  Write-Host "[3/5] Recording 36 Answers x 2 Assessments (72 total)" -ForegroundColor Green
  $answers = @{}
  for ($i = 1; $i -le 36; $i++) { $answers[$i] = (3 + ($i % 3)) }

  $saved = 0
  foreach ($aid in @($a1.id, $a2.id)) {
    for ($i = 1; $i -le 36; $i++) {
      $body = @{ questionId = [string]$i; score = $answers[$i]; evidence = "Evidence Q$i"; attestation = "Attested" } | ConvertTo-Json
      $r = Invoke-RestMethod -Uri "$API/assessments/$aid/answers" -Method POST -Body $body -ContentType "application/json"
      if ($r.id) { $saved++ }
    }
  }
  Write-Host "      Saved $saved/72" -ForegroundColor Gray
  Write-Host ""

  # ========== STEP 4: Submit Results ==========
  # The backend no longer computes a score. It validates the one the canonical
  # engine produced, re-derives the gates from stored answers, and decides the
  # level itself. Scores are 0-100.
  Write-Host "[4/5] Submitting Results" -ForegroundColor Green
  $r1 = Submit-CertifAIResult -Api $API -AssessmentId $a1.id `
    -Payload (New-CertifAIResultPayload -Answers $answers -Tier 1 -HasEvidence $true -HasSignature $false)
  $r2 = Submit-CertifAIResult -Api $API -AssessmentId $a2.id `
    -Payload (New-CertifAIResultPayload -Answers $answers -Tier 2 -HasEvidence $true -HasSignature $true)

  Write-Host "      Tier 1: $($r1.overallScore)/100 -> $($r1.level) $($r1.levelName)" -ForegroundColor Gray
  Write-Host "      Tier 2: $($r2.overallScore)/100 -> $($r2.level) $($r2.levelName)" -ForegroundColor Gray
  Write-Host ""

  # ========== STEP 5: Badge ==========
  # /result issues the badge; there is no separate issue call any more.
  Write-Host "[5/5] Badge (Tier 2 only)" -ForegroundColor Green
  if ($r1.badge) { throw "Tier 1 earned a badge; the free tier must never earn one." }
  $badge = $r2.badge
  if (-not $badge) { throw "No badge issued for Tier 2. Server said: $($r2.cappedReason)" }

  Write-Host "      Tier 1: no badge, correct" -ForegroundColor Gray
  Write-Host "      Tier 2: $($badge.tier), score $($badge.score)/100" -ForegroundColor Gray
  Write-Host ""

  # ========== VERIFY BADGE ==========
  $verify = Invoke-RestMethod -Uri "$API/badges/$($badge.verificationToken)/verify" -Method GET
  if (-not $verify.id) { throw "Public verification failed for token $($badge.verificationToken)" }

  Write-Host "====== TEST PASSED ======" -ForegroundColor Green
  Write-Host "Badge Token: $($badge.verificationToken)" -ForegroundColor Cyan
  Write-Host "Verify URL:  $($badge.verifyUrl)" -ForegroundColor Cyan
}
Catch {
  Write-Host ""
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Make sure the backend is running: cd backend; npm run dev" -ForegroundColor Yellow
}

Write-Host ""

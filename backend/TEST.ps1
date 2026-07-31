# CertifAI Happy Path Test - PowerShell 5.1 Compatible
#
# Ported from the retired POST /assessments/:id/compute-score to
# POST /assessments/:id/result, which is now the only route that issues a badge.
# The instrument lives in CanonicalScoring.ps1, not in this file.

. "$PSScriptRoot\CanonicalScoring.ps1"

$API = "http://localhost:3001/api"
$orgName = "Test Corp $(Get-Date -Format 'HHmmss')"
$orgEmail = "test$(Get-Random -Maximum 99999)@certifai.local"

Write-Host "====== CERTIFAI HAPPY PATH TEST ======" -ForegroundColor Cyan
Write-Host ""

Try {
  # ========== STEP 1: Create Company + User (lead) ==========
  Write-Host "[1/6] Creating Company + User..." -ForegroundColor Green
  $orgBody = @{ name = $orgName; email = $orgEmail; role = "Compliance/Risk" } | ConvertTo-Json
  $org = Invoke-RestMethod -Uri "$API/companies" -Method POST -Body $orgBody -ContentType "application/json"
  $userId = $org.userId
  $companyId = $org.companyId
  Write-Host "      [OK] userId: $userId  companyId: $companyId" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 2: Create Assessments ==========
  Write-Host "[2/6] Creating Tier 1 & Tier 2 Assessments..." -ForegroundColor Green
  $systemId = "system-$(Get-Random -Minimum 100000 -Maximum 999999)"

  $assess1Body = @{ userId = $userId; aiSystemId = $systemId; tier = "free" } | ConvertTo-Json
  $assess1 = Invoke-RestMethod -Uri "$API/assessments" -Method POST -Body $assess1Body -ContentType "application/json"
  $assessId1 = $assess1.id

  $assess2Body = @{ userId = $userId; aiSystemId = $systemId; tier = "professional" } | ConvertTo-Json
  $assess2 = Invoke-RestMethod -Uri "$API/assessments" -Method POST -Body $assess2Body -ContentType "application/json"
  $assessId2 = $assess2.id

  Write-Host "      [OK] Tier 1: $assessId1" -ForegroundColor Green
  Write-Host "      [OK] Tier 2: $assessId2" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 3: Record Answers ==========
  Write-Host "[3/6] Recording 36 Answers x 2 Assessments..." -ForegroundColor Green
  $count = 0
  foreach ($aId in @($assessId1, $assessId2)) {
    for ($i = 1; $i -le 36; $i++) {
      $score = (3 + ($i % 3))
      $ansBody = @{
        questionId = [string]$i
        score = $score
        evidence = "Evidence Q$i"
        attestation = "Attestation"
      } | ConvertTo-Json

      $ans = Invoke-RestMethod -Uri "$API/assessments/$aId/answers" -Method POST -Body $ansBody -ContentType "application/json" -ErrorAction SilentlyContinue
      if ($ans.id) { $count++ }
    }
  }
  Write-Host "      [OK] Saved $count/72 answers" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 4: Submit Results ==========
  # compute-score is gone. The backend no longer computes a score; it validates
  # the one the canonical engine produced, re-derives the gates from stored
  # answers, and decides the level itself. Scores are 0-100, not 0-5.
  Write-Host "[4/6] Submitting Results..." -ForegroundColor Green

  $answers = @{}
  for ($i = 1; $i -le 36; $i++) { $answers[$i] = (3 + ($i % 3)) }

  # Tier 1 is the free snapshot: no badge, whatever the score.
  $payload1 = New-CertifAIResultPayload -Answers $answers -Tier 1 -HasEvidence $true -HasSignature $false
  $score1 = Submit-CertifAIResult -Api $API -AssessmentId $assessId1 -Payload $payload1

  # Tier 2 with evidence and a signature is the badge-bearing path.
  $payload2 = New-CertifAIResultPayload -Answers $answers -Tier 2 -HasEvidence $true -HasSignature $true
  $score2 = Submit-CertifAIResult -Api $API -AssessmentId $assessId2 -Payload $payload2

  Write-Host "      [OK] Tier 1: $($score1.overallScore)/100 - $($score1.level) $($score1.badgeTier)" -ForegroundColor Green
  Write-Host "      [OK] Tier 2: $($score2.overallScore)/100 - $($score2.level) $($score2.badgeTier)" -ForegroundColor Green
  if ($score1.cappedFrom) { Write-Host "      [OK] Tier 1 correctly capped $($score1.cappedFrom) -> $($score1.level)" -ForegroundColor DarkGray }
  Write-Host ""

  # ========== STEP 5: Badge ==========
  # /result issues the badge itself when the level it resolved is badge-bearing
  # and the assessment is complete. There is no separate issue call any more.
  Write-Host "[5/6] Reading Issued Badge (Tier 2)..." -ForegroundColor Green
  $badge = $score2.badge

  if (-not $badge) {
    Write-Host "      [ERROR] No badge issued. Server said: $($score2.cappedReason)" -ForegroundColor Red
    throw "Expected a badge for a complete, evidenced, signed Tier 2 assessment."
  }
  if ($score1.badge) {
    Write-Host "      [ERROR] Tier 1 was issued a badge; the free tier must never earn one." -ForegroundColor Red
    throw "Tier 1 badge gate failed."
  }

  Write-Host "      [OK] Badge ID: $($badge.id)" -ForegroundColor Green
  Write-Host "      [OK] Tier: $($badge.tier)  Score: $($badge.score)/100" -ForegroundColor Green
  Write-Host "      [OK] Expires: $($badge.expiresAt)" -ForegroundColor Green
  Write-Host "      [OK] Tier 1 issued no badge, as required" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 6: Verify Badge ==========
  Write-Host "[6/6] Verifying Badge (Public)..." -ForegroundColor Green
  $verify = Invoke-RestMethod -Uri "$API/badges/$($badge.verificationToken)/verify" -Method GET -ErrorAction SilentlyContinue

  if ($verify.id) {
    Write-Host "      [OK] Badge verified!" -ForegroundColor Green
    Write-Host ""
    Write-Host "====== TEST PASSED ======" -ForegroundColor Green
    Write-Host ""
    Write-Host "Organization: $orgName" -ForegroundColor Cyan
    Write-Host "Badge Token: $($badge.verificationToken)" -ForegroundColor Cyan
    Write-Host "Share Link: http://localhost:5173?verify=$($badge.verificationToken)" -ForegroundColor Cyan
  } else {
    Write-Host "      [ERROR] Badge verification failed" -ForegroundColor Red
  }
}
Catch {
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ""
  Write-Host "Make sure backend is running: cd backend && npm start" -ForegroundColor Yellow
}

Write-Host ""

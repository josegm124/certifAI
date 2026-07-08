# CertifAI Happy Path Test - PowerShell 5.1 Compatible

$API = "http://localhost:3001/api"
$orgName = "Test Corp $(Get-Date -Format 'HHmmss')"
$orgEmail = "test$(Get-Random -Maximum 99999)@certifai.local"

Write-Host "====== CERTIFAI HAPPY PATH TEST ======" -ForegroundColor Cyan
Write-Host ""

Try {
  # ========== STEP 1: Create Organization ==========
  Write-Host "[1/6] Creating Organization..." -ForegroundColor Green
  $orgBody = @{ name = $orgName; email = $orgEmail } | ConvertTo-Json
  $org = Invoke-RestMethod -Uri "$API/organizations" -Method POST -Body $orgBody -ContentType "application/json"
  $orgId = $org.id
  Write-Host "      [OK] ID: $orgId" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 2: Create Assessments ==========
  Write-Host "[2/6] Creating Tier 1 & Tier 2 Assessments..." -ForegroundColor Green
  $systemId = "system-$(Get-Random -Minimum 100000 -Maximum 999999)"

  $assess1Body = @{ organizationId = $orgId; aiSystemId = $systemId; tier = "free" } | ConvertTo-Json
  $assess1 = Invoke-RestMethod -Uri "$API/assessments" -Method POST -Body $assess1Body -ContentType "application/json"
  $assessId1 = $assess1.id

  $assess2Body = @{ organizationId = $orgId; aiSystemId = $systemId; tier = "professional" } | ConvertTo-Json
  $assess2 = Invoke-RestMethod -Uri "$API/assessments" -Method POST -Body $assess2Body -ContentType "application/json"
  $assessId2 = $assess2.id

  Write-Host "      [OK] Tier 1: $assessId1" -ForegroundColor Green
  Write-Host "      [OK] Tier 2: $assessId2" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 3: Record Answers ==========
  Write-Host "[3/6] Recording 32 Answers x 2 Assessments..." -ForegroundColor Green
  $count = 0
  foreach ($aId in @($assessId1, $assessId2)) {
    for ($i = 1; $i -le 32; $i++) {
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
  Write-Host "      [OK] Saved $count/64 answers" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 4: Compute Scores ==========
  Write-Host "[4/6] Computing Scores..." -ForegroundColor Green
  $qMap = @{}
  $doms = @("strategy","strategy","strategy","strategy","strategy","governance","governance","governance","governance","governance","risk","risk","risk","risk","risk","data","data","data","data","data","human","human","human","human","trust","trust","trust","workforce","workforce","workforce","workforce","improve")
  for ($i=1; $i -le 32; $i++) {
    $qMap[[string]$i] = @{ domain = $doms[$i-1]; description = "Q$i" }
  }

  $scoreBody = @{ questionMapping = $qMap } | ConvertTo-Json -Depth 10
  $score1 = Invoke-RestMethod -Uri "$API/assessments/$assessId1/compute-score" -Method POST -Body $scoreBody -ContentType "application/json"
  $score2 = Invoke-RestMethod -Uri "$API/assessments/$assessId2/compute-score" -Method POST -Body $scoreBody -ContentType "application/json"

  Write-Host "      [OK] Tier 1: $($score1.overallScore)/5 - $($score1.badgeTier)" -ForegroundColor Green
  Write-Host "      [OK] Tier 2: $($score2.overallScore)/5 - $($score2.badgeTier)" -ForegroundColor Green
  Write-Host ""

  # ========== STEP 5: Issue Badge ==========
  Write-Host "[5/6] Issuing Badge (Tier 2)..." -ForegroundColor Green
  $badgeBody = @{
    organizationId = $orgId
    tier = $score2.badgeTier
    overallScore = $score2.overallScore
    frameworks = @("aiact","gdpr","oecd","iso","nist")
  } | ConvertTo-Json

  $badge = Invoke-RestMethod -Uri "$API/assessments/$assessId2/badges" -Method POST -Body $badgeBody -ContentType "application/json"

  Write-Host "      [OK] Badge ID: $($badge.id)" -ForegroundColor Green
  Write-Host "      [OK] Tier: $($badge.tier)" -ForegroundColor Green
  Write-Host "      [OK] Expires: $($badge.expiresAt)" -ForegroundColor Green
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

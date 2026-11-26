param([string]$Deployment)
$ErrorActionPreference = 'Stop'
$qaDir = Join-Path $PSScriptRoot '../artifacts'
$authConfig = Join-Path $qaDir 'request-auth.local.txt'
$bodyPath = Join-Path $qaDir 'request-body.local.json'
$responsePath = Join-Path $qaDir 'response.local.json'
$statusPath = Join-Path $qaDir 'live-verification.json'
try {
  # Public Firebase project key; creates only this QA session's anonymous account.
  $account = Invoke-RestMethod -Method Post -Uri 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAjciDML9XEB8jZlC1kG6MGpxlXtHdeFKY' -ContentType 'application/json' -Body '{"returnSecureToken":true}'
  @('header = "Content-Type: application/json"', ('header = "Authorization: Bearer ' + $account.idToken + '"')) | Set-Content -LiteralPath $authConfig -Encoding utf8
  function Call-Flower([string]$Path, $Body) {
    $Body | ConvertTo-Json -Depth 10 -Compress | Set-Content -LiteralPath $bodyPath -Encoding utf8
    & vercel curl $Path --deployment $Deployment -- --silent --show-error --request POST --config $authConfig --data-binary "@$bodyPath" --output $responsePath
    if ($LASTEXITCODE -ne 0) { throw 'Authenticated request failed' }
    return Get-Content -LiteralPath $responsePath -Raw | ConvertFrom-Json
  }
  $wallet = Call-Flower '/api/wallet' @{action='state'}
  if ($wallet.balance -ne 5 -or $wallet.rewards.ad -ne $false) { throw 'Initial daily quota is invalid' }
  $reward = Call-Flower '/api/wallet' @{action='finishReward';event='userEarnedReward';ticket=('a'*64)}
  if ($reward.error -notmatch '종료') { throw 'Legacy reward was not rejected' }
  $image = Get-Content (Join-Path $qaDir 'analysis-image.local.json') -Raw | ConvertFrom-Json
  $requestId = [guid]::NewGuid().ToString()
  $result = Call-Flower '/api/analyze-flower' @{image=$image.image;requestId=$requestId}
  if (!$result.name -or $result.wallet.balance -ne 4) { throw ('Live analysis failed: ' + $result.error) }
  $retry = Call-Flower '/api/analyze-flower' @{image=$image.image;requestId=$requestId}
  if ($retry.wallet.balance -ne 4 -or $retry.name -ne $result.name) { throw 'Retry charged quota twice' }
  $card = Call-Flower '/api/share-card' @{action='create';card=@{image=$image.image;name='웹앱 검증 카드';language='테스트';memo='';createdAt=[DateTime]::UtcNow.ToString('o')}}
  $shareVerified = $false
  if ($card.token) {
    & vercel curl "/s/$($card.token)" --deployment $Deployment -- --silent --show-error --output (Join-Path $qaDir 'shared-card.local.html')
    $shared = Get-Content (Join-Path $qaDir 'shared-card.local.html') -Raw
    if ($shared -match 'intoss:|토스에서') { throw 'Shared card still links to Toss' }
    $null = Call-Flower '/api/share-card' @{action='revoke';token=$card.token}
    $shareVerified = $shared -match '웹앱 검증 카드'
  } else { throw ('Card share failed: ' + $card.error) }
  $final = Call-Flower '/api/wallet' @{action='state'}
  if ($final.balance -ne 4) { throw 'Sharing changed daily quota' }
  @{deployment=$Deployment;initial=5;afterAnalysis=4;afterRetry=$retry.wallet.balance;afterSharing=$final.balance;plant=$result.name;legacyRewardsRejected=$true;cardShareRevoked=$shareVerified;time=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $statusPath
  Write-Output "PASS: live anonymous auth, Firestore quota 5->4, AI $($result.name), retry stays 4, forged reward rejected, card shared and revoked, quota unchanged"
} finally {
  foreach ($privateFile in @($authConfig,$bodyPath,$responsePath,(Join-Path $qaDir 'shared-card.local.html'))) { if(Test-Path -LiteralPath $privateFile) { Remove-Item -LiteralPath $privateFile } }
}

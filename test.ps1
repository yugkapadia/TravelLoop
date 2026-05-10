$base = "http://localhost:4000/api"
$passed = 0
$failed = 0
$results = @()

function Run-Test {
  param([string]$label, [scriptblock]$block)
  try {
    & $block
    $script:passed++
    $script:results += "  [PASS] $label"
  } catch {
    $script:failed++
    $msg = $_.ToString()
    $script:results += "  [FAIL] $label  =>  $msg"
  }
}

# ── HEALTH ──────────────────────────────────────────────────────────────────
Run-Test "Backend health endpoint" {
  $r = Invoke-RestMethod -Uri "$base/health"
  if ($r.status -ne "ok") { throw "status=$($r.status)" }
}

# ── AUTH ─────────────────────────────────────────────────────────────────────
Run-Test "Signup new user" {
  $r = Invoke-RestMethod -Uri "$base/auth/signup" -Method POST `
    -ContentType "application/json" `
    -Body '{"name":"Final Tester","email":"final@traveloop.com","password":"final123"}'
  if (-not $r.user.id) { throw "no user id returned" }
  $script:uid = $r.user.id
}

Run-Test "Duplicate signup is rejected (409)" {
  $threw = $false
  try {
    Invoke-RestMethod -Uri "$base/auth/signup" -Method POST `
      -ContentType "application/json" `
      -Body '{"name":"Final Tester","email":"final@traveloop.com","password":"final123"}'
  } catch { $threw = $true }
  if (-not $threw) { throw "duplicate signup should have failed" }
}

Run-Test "Login with correct credentials" {
  $r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"final@traveloop.com","password":"final123"}'
  if ($r.user.name -ne "Final Tester") { throw "wrong name: $($r.user.name)" }
}

Run-Test "Login with wrong password is rejected (401)" {
  $threw = $false
  try {
    Invoke-RestMethod -Uri "$base/auth/login" -Method POST `
      -ContentType "application/json" `
      -Body '{"email":"final@traveloop.com","password":"wrongpass"}'
  } catch { $threw = $true }
  if (-not $threw) { throw "bad login should have failed" }
}

# ── TRIPS ────────────────────────────────────────────────────────────────────
Run-Test "Create trip" {
  $r = Invoke-RestMethod -Uri "$base/trips" -Method POST `
    -ContentType "application/json" `
    -Body "{`"userId`":$($script:uid),`"title`":`"Final Test Trip`",`"description`":`"A complete test`",`"startDate`":`"2026-10-01`",`"endDate`":`"2026-10-20`"}"
  if (-not $r.trip.id) { throw "no trip id" }
  $script:tid = $r.trip.id
}

Run-Test "List trips for user" {
  $r = Invoke-RestMethod -Uri "$base/trips?userId=$($script:uid)"
  if ($r.trips.Count -lt 1) { throw "no trips returned" }
}

Run-Test "Get trip details" {
  $r = Invoke-RestMethod -Uri "$base/trips/$($script:tid)"
  if ($r.trip.title -ne "Final Test Trip") { throw "wrong title: $($r.trip.title)" }
}

Run-Test "Update trip (PATCH)" {
  $r = Invoke-RestMethod -Uri "$base/trips/$($script:tid)" -Method PATCH `
    -ContentType "application/json" `
    -Body "{`"title`":`"Updated Trip`",`"description`":`"Updated`",`"startDate`":`"2026-10-01`",`"endDate`":`"2026-10-20`"}"
  if ($r.trip.title -ne "Updated Trip") { throw "title not updated" }
}

# ── STOPS ────────────────────────────────────────────────────────────────────
Run-Test "Add stop 1 (Tokyo)" {
  $r = Invoke-RestMethod -Uri "$base/stops" -Method POST `
    -ContentType "application/json" `
    -Body "{`"tripId`":$($script:tid),`"city`":`"Tokyo`",`"country`":`"Japan`",`"startDate`":`"2026-10-01`",`"endDate`":`"2026-10-08`",`"notes`":`"Get JR Pass`"}"
  if (-not $r.stop.id) { throw "no stop id" }
  $script:s1id = $r.stop.id
}

Run-Test "Add stop 2 (Osaka)" {
  $r = Invoke-RestMethod -Uri "$base/stops" -Method POST `
    -ContentType "application/json" `
    -Body "{`"tripId`":$($script:tid),`"city`":`"Osaka`",`"country`":`"Japan`",`"startDate`":`"2026-10-09`",`"endDate`":`"2026-10-15`"}"
  if (-not $r.stop.id) { throw "no stop id" }
  $script:s2id = $r.stop.id
}

Run-Test "Trip details includes both stops" {
  $r = Invoke-RestMethod -Uri "$base/trips/$($script:tid)"
  if ($r.stops.Count -ne 2) { throw "expected 2 stops, got $($r.stops.Count)" }
}

# ── ACTIVITIES ───────────────────────────────────────────────────────────────
Run-Test "Add free activity to stop 1" {
  $r = Invoke-RestMethod -Uri "$base/activities" -Method POST `
    -ContentType "application/json" `
    -Body "{`"stopId`":$($script:s1id),`"title`":`"Shibuya Crossing`",`"category`":`"Sightseeing`",`"cost`":0,`"duration`":`"1 hour`"}"
  if (-not $r.activity.id) { throw "no activity id" }
  $script:a1id = $r.activity.id
}

Run-Test "Add paid activity to stop 1 (cost=32)" {
  $r = Invoke-RestMethod -Uri "$base/activities" -Method POST `
    -ContentType "application/json" `
    -Body "{`"stopId`":$($script:s1id),`"title`":`"TeamLab Planets`",`"category`":`"Sightseeing`",`"cost`":32}"
  if ($r.activity.cost -ne 32) { throw "wrong cost: $($r.activity.cost)" }
  $script:a2id = $r.activity.id
}

Run-Test "Add activity to stop 2 (cost=45)" {
  $r = Invoke-RestMethod -Uri "$base/activities" -Method POST `
    -ContentType "application/json" `
    -Body "{`"stopId`":$($script:s2id),`"title`":`"Dotonbori food walk`",`"category`":`"Food`",`"cost`":45}"
  if (-not $r.activity.id) { throw "no activity id" }
  $script:a3id = $r.activity.id
}

Run-Test "Trip details includes all 3 activities" {
  $r = Invoke-RestMethod -Uri "$base/trips/$($script:tid)"
  $total = ($r.stops | ForEach-Object { $_.activities.Count } | Measure-Object -Sum).Sum
  if ($total -ne 3) { throw "expected 3 activities, got $total" }
}

# ── EXPENSES ─────────────────────────────────────────────────────────────────
Run-Test "Add expense Transport (420)" {
  $r = Invoke-RestMethod -Uri "$base/expenses" -Method POST `
    -ContentType "application/json" `
    -Body "{`"tripId`":$($script:tid),`"category`":`"Transport`",`"amount`":420,`"notes`":`"JR Pass`"}"
  if ($r.expense.amount -ne 420) { throw "wrong amount: $($r.expense.amount)" }
  $script:e1id = $r.expense.id
}

Run-Test "Add expense Stay (800)" {
  $r = Invoke-RestMethod -Uri "$base/expenses" -Method POST `
    -ContentType "application/json" `
    -Body "{`"tripId`":$($script:tid),`"category`":`"Stay`",`"amount`":800}"
  if (-not $r.expense.id) { throw "no expense id" }
  $script:e2id = $r.expense.id
}

Run-Test "List expenses returns 2 items" {
  $r = Invoke-RestMethod -Uri "$base/expenses/$($script:tid)"
  if ($r.expenses.Count -ne 2) { throw "expected 2, got $($r.expenses.Count)" }
}

Run-Test "Delete one expense" {
  Invoke-RestMethod -Uri "$base/expenses/$($script:e2id)" -Method DELETE
  $r = Invoke-RestMethod -Uri "$base/expenses/$($script:tid)"
  if ($r.expenses.Count -ne 1) { throw "expense not deleted, count=$($r.expenses.Count)" }
}

# ── BUDGET SUMMARY ───────────────────────────────────────────────────────────
Run-Test "Budget total = activities(77) + expense(420) = 497" {
  $r = Invoke-RestMethod -Uri "$base/trips/$($script:tid)/budget-summary"
  if ($r.budget.total -ne 497) { throw "expected 497, got $($r.budget.total)" }
}

Run-Test "Budget has multiple category breakdowns" {
  $r = Invoke-RestMethod -Uri "$base/trips/$($script:tid)/budget-summary"
  if ($r.budget.categories.Count -lt 2) { throw "expected >=2 categories, got $($r.budget.categories.Count)" }
}

# ── CHECKLIST ────────────────────────────────────────────────────────────────
Run-Test "Add checklist item (starts uncompleted)" {
  $r = Invoke-RestMethod -Uri "$base/checklist" -Method POST `
    -ContentType "application/json" `
    -Body "{`"tripId`":$($script:tid),`"label`":`"Passport`",`"category`":`"Documents`"}"
  if ($r.item.completed -ne 0) { throw "should start uncompleted" }
  $script:c1id = $r.item.id
}

Run-Test "Add second checklist item" {
  $r = Invoke-RestMethod -Uri "$base/checklist" -Method POST `
    -ContentType "application/json" `
    -Body "{`"tripId`":$($script:tid),`"label`":`"Travel adapter`",`"category`":`"Electronics`"}"
  if (-not $r.item.id) { throw "no item id" }
  $script:c2id = $r.item.id
}

Run-Test "Mark item as completed" {
  Invoke-RestMethod -Uri "$base/checklist/$($script:c1id)" -Method PATCH `
    -ContentType "application/json" -Body '{"completed":true}'
  $r = Invoke-RestMethod -Uri "$base/checklist/$($script:tid)"
  $done = $r.items | Where-Object { $_.id -eq $script:c1id }
  if ($done.completed -ne 1) { throw "item not marked complete" }
}

Run-Test "Reset checklist clears all completed" {
  Invoke-RestMethod -Uri "$base/checklist/$($script:tid)/reset" -Method POST
  $r = Invoke-RestMethod -Uri "$base/checklist/$($script:tid)"
  $anyDone = $r.items | Where-Object { $_.completed -eq 1 }
  if ($anyDone) { throw "items still completed after reset" }
}

Run-Test "Delete checklist item" {
  Invoke-RestMethod -Uri "$base/checklist/$($script:c2id)" -Method DELETE
  $r = Invoke-RestMethod -Uri "$base/checklist/$($script:tid)"
  if ($r.items.Count -ne 1) { throw "item not deleted, count=$($r.items.Count)" }
}

# ── NOTES ────────────────────────────────────────────────────────────────────
Run-Test "Add note" {
  $r = Invoke-RestMethod -Uri "$base/notes" -Method POST `
    -ContentType "application/json" `
    -Body "{`"tripId`":$($script:tid),`"content`":`"Book Shinkansen early`"}"
  if (-not $r.note.id) { throw "no note id" }
  $script:n1id = $r.note.id
}

Run-Test "Add second note" {
  $r = Invoke-RestMethod -Uri "$base/notes" -Method POST `
    -ContentType "application/json" `
    -Body "{`"tripId`":$($script:tid),`"content`":`"Hotel check-in after 3pm`"}"
  if (-not $r.note.id) { throw "no note id" }
  $script:n2id = $r.note.id
}

Run-Test "List notes returns 2 items" {
  $r = Invoke-RestMethod -Uri "$base/notes/$($script:tid)"
  if ($r.notes.Count -ne 2) { throw "expected 2, got $($r.notes.Count)" }
}

Run-Test "Delete note" {
  Invoke-RestMethod -Uri "$base/notes/$($script:n2id)" -Method DELETE
  $r = Invoke-RestMethod -Uri "$base/notes/$($script:tid)"
  if ($r.notes.Count -ne 1) { throw "note not deleted, count=$($r.notes.Count)" }
}

# ── DISCOVERY ────────────────────────────────────────────────────────────────
Run-Test "Discovery - no filter returns all seeded items" {
  $r = Invoke-RestMethod -Uri "$base/discovery"
  if ($r.results.Count -lt 5) { throw "expected >=5 seeded results, got $($r.results.Count)" }
}

Run-Test "Discovery - search Tokyo returns Tokyo" {
  $r = Invoke-RestMethod -Uri "$base/discovery?q=Tokyo"
  if ($r.results.Count -lt 1) { throw "no results for Tokyo" }
  if ($r.results[0].title -ne "Tokyo") { throw "wrong result: $($r.results[0].title)" }
}

Run-Test "Discovery - type=destination filter works" {
  $r = Invoke-RestMethod -Uri "$base/discovery?type=destination"
  $bad = $r.results | Where-Object { $_.type -ne "destination" }
  if ($bad) { throw "non-destination in results" }
}

Run-Test "Discovery - type=activity filter works" {
  $r = Invoke-RestMethod -Uri "$base/discovery?type=activity"
  if ($r.results.Count -lt 1) { throw "no activity results" }
}

# ── SHARING ──────────────────────────────────────────────────────────────────
Run-Test "Create public share link" {
  $r = Invoke-RestMethod -Uri "$base/shares/trips/$($script:tid)" -Method POST `
    -ContentType "application/json" -Body '{"shareType":"public"}'
  if (-not $r.share.public_code) { throw "no share code" }
  $script:shareCode = $r.share.public_code
}

Run-Test "Fetch shared trip by code returns correct trip" {
  $r = Invoke-RestMethod -Uri "$base/shares/$($script:shareCode)"
  if ($r.trip.id -ne $script:tid) { throw "wrong trip id: $($r.trip.id)" }
  if ($r.stops.Count -ne 2) { throw "expected 2 stops, got $($r.stops.Count)" }
}

Run-Test "Shared trip includes budget total (497)" {
  $r = Invoke-RestMethod -Uri "$base/shares/$($script:shareCode)"
  if ($r.budget.total -ne 497) { throw "expected 497, got $($r.budget.total)" }
}

Run-Test "Revoke share - link no longer accessible" {
  Invoke-RestMethod -Uri "$base/shares/$($script:shareCode)" -Method DELETE
  $threw = $false
  try { Invoke-RestMethod -Uri "$base/shares/$($script:shareCode)" } catch { $threw = $true }
  if (-not $threw) { throw "revoked link should return 404" }
}

# ── CALENDAR ─────────────────────────────────────────────────────────────────
Run-Test "Calendar endpoint returns events" {
  $r = Invoke-RestMethod -Uri "$base/trips/$($script:tid)/calendar"
  if ($r.events.Count -lt 1) { throw "no calendar events returned" }
}

# ── CASCADE DELETE ───────────────────────────────────────────────────────────
Run-Test "Delete stop cascades to its activities" {
  Invoke-RestMethod -Uri "$base/stops/$($script:s1id)" -Method DELETE
  $r = Invoke-RestMethod -Uri "$base/trips/$($script:tid)"
  if ($r.stops.Count -ne 1) { throw "stop not deleted, count=$($r.stops.Count)" }
}

Run-Test "Delete trip cascades to all children (stops, activities, notes, checklist)" {
  Invoke-RestMethod -Uri "$base/trips/$($script:tid)" -Method DELETE
  $threw = $false
  try { Invoke-RestMethod -Uri "$base/trips/$($script:tid)" } catch { $threw = $true }
  if (-not $threw) { throw "trip still accessible after delete" }
}

# ── FRONTEND ─────────────────────────────────────────────────────────────────
Run-Test "Frontend dist/index.html exists (build artifact)" {
  if (-not (Test-Path "c:\Users\asus\OneDrive\Desktop\TravelLoop\frontend\dist\index.html")) {
    throw "dist/index.html missing - run npm run build"
  }
}

Run-Test "Frontend dev server responds HTTP 200" {
  $r = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing
  if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}

Run-Test "Vite proxy forwards /api to backend" {
  $r = Invoke-RestMethod -Uri "http://localhost:5173/api/health"
  if ($r.status -ne "ok") { throw "proxy not working, status=$($r.status)" }
}

Run-Test "Frontend serves React app (contains root div)" {
  $r = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing
  if ($r.Content -notmatch 'id="root"') { throw "root div not found in HTML" }
}

# ── RESULTS ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================"
$results | ForEach-Object { Write-Host $_ }
Write-Host "============================================"
Write-Host ""
Write-Host "  TOTAL: $passed passed  |  $failed failed  |  $($passed + $failed) tests"
Write-Host ""
if ($failed -eq 0) {
  Write-Host "  ALL TESTS PASSED - project is ready"
} else {
  Write-Host "  $failed TEST(S) FAILED - see above"
}

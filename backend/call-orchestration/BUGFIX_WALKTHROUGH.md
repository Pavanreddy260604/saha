# Call Orchestration - Bug Fixes Walkthrough

## Summary
Fixed critical bugs preventing the trigger API route from working correctly in the call orchestration service.

---

## Bugs Encountered & Fixed

### 🐛 Bug #1: Wrong UPDATE Result Check
**File:** `src/services/fakeDialer.js`

**Problem:** The code checked `result.rows.length` after an UPDATE query, but UPDATE queries don't populate `.rows` without a `RETURNING` clause.

```diff
- if(result.rows.length === 0){
+ if(result.rowCount === 0){
```

**Impact:** The fakeDialer would always log "not claimable" and return early, even on successful updates.

---

### 🐛 Bug #2: Wrong Column Name
**File:** `src/routes/webhooks.js`

**Problem:** INSERT query used `retries` but the `calls` table column is `retry_count`.

```diff
- retries,
+ retry_count,
```

**Impact:** Inbound webhook calls would fail with a database error.

---

### ⚠️ Issue #3: Route Prefix Conflict
**File:** `src/app.js`

**Problem:** Both `webhookRouter` and `providerEventsRouter` used `/webhooks` prefix.

```diff
- app.use("/webhooks", providerEventsRouter);
+ app.use("/provider", providerEventsRouter);
```

**Impact:** Confusing route structure. Now clearly separated.

---

## Verification Results

### Test: Create and Trigger Calls
```bash
# Created call with delay
curl -X POST http://localhost:3000/api/calls/outbound \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919999999999", "delay_minutes": 5}'

# Manual trigger worked ✅
curl -X POST http://localhost:3000/api/calls/{id}/trigger
# Response: {"message":"Call triggered","call":{...status:"CLAIMED"...}}
```

### Test: Scheduler Automatic Processing
- Created 5 calls with 1-minute intervals
- Scheduler picked up each call automatically when `next_action_at` time arrived
- All calls transitioned: `PENDING → CLAIMED → IN_PROGRESS` ✅

### Final Status Check
```bash
curl http://localhost:3000/api/calls
# All test calls showing status: "IN_PROGRESS" ✅
```

# HelpX MVP — Phase 2 Testing Script

FastAPI + PostgreSQL + React — Core marketplace flows (Auth, Services, Bookings, Admin).

## 1) Manual Test Cases

Fill Status as Pass/Fail after execution.

### Auth & Roles
- **TC-A1**  
  - Role: User  
  - Endpoint/UI: `POST /auth/register` (API)  
  - Precondition: DB reachable.  
  - Steps: Register new user with email/password.  
  - Expected: 201 with user payload (role=customer/user).  
  - Status: ___

- **TC-A2**  
  - Role: User  
  - Endpoint/UI: `POST /auth/login` (API)  
  - Precondition: TC-A1 user exists.  
  - Steps: Login with same creds.  
  - Expected: 200 + JWT token.  
  - Status: ___

- **TC-A3**  
  - Role: Provider  
  - Endpoint/UI: `POST /auth/login` (API)  
  - Precondition: Provider user exists, role=provider.  
  - Steps: Login.  
  - Expected: 200 + JWT token.  
  - Status: ___

- **TC-A4**  
  - Role: Admin  
  - Endpoint/UI: `POST /auth/login` (API)  
  - Precondition: Admin user exists, role=admin.  
  - Steps: Login.  
  - Expected: 200 + JWT token.  
  - Status: ___

### User Flows
- **TC-U1**  
  - Role: User  
  - Endpoint/UI: `POST /bookings/`  
  - Precondition: Service exists & approved; user logged in.  
  - Steps: Create booking for service.  
  - Expected: 201 booking with status=pending.  
  - Status: ___

- **TC-U2**  
  - Role: User  
  - Endpoint/UI: `PUT /bookings/{id}/cancel`  
  - Precondition: Booking status pending/accepted, belongs to user.  
  - Steps: Cancel booking.  
  - Expected: 200 booking status=cancelled.  
  - Status: ___

- **TC-U3**  
  - Role: User  
  - Endpoint/UI: `PUT /bookings/{id}/cancel`  
  - Precondition: Booking status=completed.  
  - Steps: Attempt cancel.  
  - Expected: 400 error (cannot cancel completed).  
  - Status: ___

### Provider Flows
- **TC-P1**  
  - Role: Provider  
  - Endpoint/UI: `POST /provider/services`  
  - Precondition: Provider logged in.  
  - Steps: Create service (approved default=false).  
  - Expected: 201 service with approved=false.  
  - Status: ___

- **TC-P2**  
  - Role: Provider  
  - Endpoint/UI: `GET /provider/services`  
  - Precondition: Service exists for provider.  
  - Steps: List own services.  
  - Expected: 200 list containing owned services only.  
  - Status: ___

- **TC-P3**  
  - Role: Provider  
  - Endpoint/UI: `PUT /provider/services/{id}`  
  - Precondition: Service owned, not approved.  
  - Steps: Update title/price.  
  - Expected: 200 updated; if approved already → 403.  
  - Status: ___

- **TC-P4**  
  - Role: Provider  
  - Endpoint/UI: `DELETE /provider/services/{id}`  
  - Precondition: Service owned, not approved.  
  - Steps: Delete service.  
  - Expected: 204; if approved → 403.  
  - Status: ___

- **TC-P5**  
  - Role: Provider  
  - Endpoint/UI: `GET /provider/bookings`  
  - Precondition: Bookings exist for provider.  
  - Steps: List bookings.  
  - Expected: 200 bookings only for provider.  
  - Status: ___

- **TC-P6**  
  - Role: Provider  
  - Endpoint/UI: `PUT /provider/bookings/{id}/accept`  
  - Precondition: Booking pending, belongs to provider.  
  - Steps: Accept booking.  
  - Expected: 200 status=accepted.  
  - Status: ___

- **TC-P7**  
  - Role: Provider  
  - Endpoint/UI: `PUT /provider/bookings/{id}/reject`  
  - Precondition: Booking pending, belongs to provider.  
  - Steps: Reject booking.  
  - Expected: 200 status=rejected.  
  - Status: ___

- **TC-P8**  
  - Role: Provider  
  - Endpoint/UI: `PUT /provider/bookings/{id}/complete`  
  - Precondition: Booking accepted, belongs to provider.  
  - Steps: Complete booking.  
  - Expected: 200 status=completed.  
  - Status: ___

### Booking State & Rules
- **TC-B1**  
  - Role: Provider  
  - Endpoint/UI: `PUT /provider/bookings/{id}/accept` twice  
  - Precondition: Booking pending.  
  - Steps: Accept, then accept again.  
  - Expected: Second call → 400 (invalid state).  
  - Status: ___

- **TC-B2**  
  - Role: Provider  
  - Endpoint/UI: `PUT /provider/bookings/{id}/complete` after completed  
  - Precondition: Booking already completed.  
  - Steps: Complete again.  
  - Expected: 400 (invalid state).  
  - Status: ___

- **TC-B3**  
  - Role: User  
  - Endpoint/UI: `PUT /bookings/{id}/cancel` after completed  
  - Precondition: Booking completed.  
  - Steps: Cancel.  
  - Expected: 400 (cannot cancel completed).  
  - Status: ___

### Admin Moderation
- **TC-AD1**  
  - Role: Admin  
  - Endpoint/UI: `GET /admin/services`  
  - Precondition: Services exist.  
  - Steps: List services.  
  - Expected: 200 all services (approved+pending).  
  - Status: ___

- **TC-AD2**  
  - Role: Admin  
  - Endpoint/UI: `PUT /admin/services/{id}/approve`  
  - Precondition: Service pending.  
  - Steps: Approve service.  
  - Expected: 200 approved=true, flagged=false.  
  - Status: ___

- **TC-AD3**  
  - Role: Admin  
  - Endpoint/UI: `PUT /admin/services/{id}/reject`  
  - Precondition: Service pending.  
  - Steps: Reject service.  
  - Expected: 200 approved=false, flagged=true.  
  - Status: ___

- **TC-AD4**  
  - Role: Admin  
  - Endpoint/UI: `PUT /admin/providers/{id}/suspend`  
  - Precondition: Provider exists.  
  - Steps: Suspend provider.  
  - Expected: 200 provider active=false (or suspended flag true).  
  - Status: ___

- **TC-AD5**  
  - Role: Admin  
  - Endpoint/UI: `PUT /admin/providers/{id}/unsuspend`  
  - Precondition: Provider suspended.  
  - Steps: Unsuspend.  
  - Expected: 200 provider active=true.  
  - Status: ___

- **TC-AD6 (Unauthorized)**  
  - Role: User  
  - Endpoint/UI: `GET /admin/services`  
  - Precondition: Logged in as non-admin.  
  - Steps: Call endpoint.  
  - Expected: 403/401.  
  - Status: ___

### Unauthorized / Ownership
- **TC-UO1**  
  - Role: Provider A  
  - Endpoint/UI: `PUT /provider/services/{id}` (service of Provider B)  
  - Precondition: Service owned by Provider B.  
  - Steps: Attempt update.  
  - Expected: 403 forbidden.  
  - Status: ___

- **TC-UO2**  
  - Role: User  
  - Endpoint/UI: `POST /provider/services`  
  - Precondition: Logged in as user.  
  - Steps: Attempt create provider service.  
  - Expected: 403.  
  - Status: ___

---

## 2) Backend API Test Checklist
- [ ] Auth endpoints return correct codes (201 register, 200 login, 401 unauthorized)
- [ ] JWT required on protected routes
- [ ] Role checks: provider-only, admin-only enforced
- [ ] Provider cannot modify others’ services (403)
- [ ] Booking state rules: accept/reject only from pending
- [ ] Complete only from accepted
- [ ] User cancel only when pending/accepted
- [ ] Admin approval sets approved=true, flagged=false
- [ ] Admin reject sets approved=false, flagged=true
- [ ] Public services list only shows approved=true

---

## 3) Sample cURL Commands
Adjust tokens/IDs after running login.

```bash
# Register user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"Passw0rd!","name":"User One"}'

# Login user
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@example.com","password":"Passw0rd!"}'
# -> copy access_token to USER_TOKEN

# Create service (provider)
curl -X POST http://localhost:8000/provider/services \
  -H "Authorization: Bearer PROVIDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Demo Cleaning","description":"Deep clean","category":"Cleaning","price":500}'

# Create booking (user)
curl -X POST http://localhost:8000/bookings/ \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service_id":SERVICE_ID,"provider_id":PROVIDER_ID,"scheduled_at":"2025-01-01T12:00:00Z"}'

# Accept booking (provider)
curl -X PUT http://localhost:8000/provider/bookings/BOOKING_ID/accept \
  -H "Authorization: Bearer PROVIDER_TOKEN"

# Complete booking (provider)
curl -X PUT http://localhost:8000/provider/bookings/BOOKING_ID/complete \
  -H "Authorization: Bearer PROVIDER_TOKEN"

# Admin suspend provider
curl -X PUT http://localhost:8000/admin/providers/PROVIDER_ID/suspend \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 4) DB Validation Queries (PostgreSQL)

```sql
-- Users and roles
SELECT id, email, role, is_active FROM app_users ORDER BY id;

-- Providers
SELECT id, user_id, business_name, active FROM providers ORDER BY id;

-- Services (approved state)
SELECT id, provider_id, title, approved, flagged FROM services ORDER BY id;

-- Bookings and transitions
SELECT id, service_id, provider_id, user_id, status, scheduled_at, created_at
FROM bookings ORDER BY id;

-- Orphan checks (service without provider)
SELECT s.id FROM services s
LEFT JOIN providers p ON p.id = s.provider_id
WHERE p.id IS NULL;

-- Orphan checks (booking without service/provider/user)
SELECT b.id FROM bookings b
LEFT JOIN services s ON s.id = b.service_id
LEFT JOIN providers p ON p.id = b.provider_id
LEFT JOIN app_users u ON u.id = b.user_id
WHERE s.id IS NULL OR p.id IS NULL OR u.id IS NULL;
```

---

## 5) Error & Edge Case Tests
- Double accept same booking → 400
- Complete an already completed booking → 400
- Unauthorized admin access by user/provider → 403/401
- Provider edits another provider’s service → 403
- User cancels completed booking → 400

---

## 6) Final Phase 2 Completion Checklist
- [ ] User register/login works
- [ ] Provider login & service CRUD (pre-approval) works
- [ ] Booking: user create → provider accept/reject → provider complete
- [ ] User cancel rules enforced
- [ ] Admin approve/reject services, suspend/unsuspend providers
- [ ] Unauthorized access blocked
- [ ] Public services show only approved
- [ ] No orphan DB records
- [ ] Ready for Phase 3 (maps/payments/mobile polish)


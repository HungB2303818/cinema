# AGENTS.md — Instructions for AI coding agents

You are implementing **Cinema Booking System** (a Vietnamese-language course project). Read `README.md`, `docs/00-PROJECT-CONTEXT.md`, `docs/02-BUSINESS-RULES.md`, `docs/05-DATABASE.md` and `docs/07-ARCHITECTURE.md` before writing domain code. For specific tasks, read the matching use case, workflow, API and tests.

## Non-negotiable business invariants

1. **Never sell or hold the same seat to two active bookings for the same showtime.** MySQL `showtime_seats` is the booking inventory source of truth, **not** `seats.status` and **not** Redis.
2. **A multi-seat booking is all-or-nothing.** Use one DB transaction: create `PENDING` booking, acquire locks on all targeted `showtime_seats`, set `HELD`, create `booking_seats`, calculate snapshot prices; rollback if any seat unavailable.
3. **Booking cutoff:** no new holds at/after `showtime.starts_at - 10 minutes`; **hold TTL:** 5 minutes; **all time comparisons:** UTC.
4. `HELD` is valid only while `hold_expires_at > current DB time`. Expired holds may be reassigned even before the cleanup job runs. The old booking must then be unable to confirm.
5. Payment `FAILED` does **not** make a booking `FAILED`; an unexpired `PENDING` booking can retry. At most **one successful payment per booking**.
6. After payment success, atomically: `payments.SUCCESS` + `bookings.CONFIRMED` + `showtime_seats.BOOKED` + non-guessable unique `ticket_code` for every seat.
7. Cancellation applies to the **owner's PENDING booking only**. `CONFIRMED` booking refunds/cancellation are outside MVP.
8. Cleanup/cancel must release **only seats whose `current_booking_id` equals that booking**, to avoid releasing seats reclaimed by another customer.
9. `booking_seats` stores historical seat selections. Do **not** add `UNIQUE(showtime_seat_id)` there; old expired/cancelled booking records may share the seat with a later booking.
10. Role/ownership checks are mandatory. Never trust a client-supplied `userId`. Staff check-in requires authenticated STAFF/ADMIN.
11. Physical seat must belong to the showtime's room, and `booking_seats` must refer to `showtime_seats` of the booking's showtime. Protect cross-table invariants in services + tests.
12. Do not delete historical booking/payment/ticket records. Do not modify room/seat/showtime structure if existing relevant bookings would be affected.

## Architecture and data contracts

- Use Java/Spring Boot, MySQL InnoDB, JPA, Spring Security/JWT, DTOs, MapStruct (optional), Flyway migrations, JUnit + Testcontainers. Frontend: React + Vite.
- Use a **modular monolith** grouped by business feature: `auth`, `catalog`, `cinema`, `showtime`, `booking`, `payment`, `ticket`, `report`, `common`.
- **The schema file `database/cinema_booking_schema.sql` is canonical** for table/column/enum names. Examples: `showtimes.starts_at`, `showtime_seats.current_booking_id` (not `held_by_booking_id`), `payments.idempotency_key`.
- Existing DDL contains 11 tables, MySQL `ENUM`, `CHECK`, and a generated unique column `payments.successful_booking_id`. Do not silently change schema, remove constraints, or use `ddl-auto=update` as a replacement for migrations.
- DTOs at API boundaries; `@Transactional` on service operations that write multiple tables. Do not return JPA entities directly.
- Consistent lock strategy for seat-affecting operations: **lock booking row (when existing) then showtime-seat rows in ascending ID order**. At creation, insert/lock new booking first; handle deadlocks with bounded retry. Schedule creation locks its room row before overlap detection.
- Idempotency: booking `clientRequestId` scoped per user; payment `idempotencyKey` unique globally. Same key + same request → same result; same key + changed request → HTTP 409. The database keys alone do not compare request payloads: the service must do so.
- Price: `showtime.base_price + (VIP ? showtime.vip_surcharge : 0)`, stored immutably as `booking_seats.unit_price` on booking creation. Server calculates `bookings.total_amount`.
- Time: persist UTC `DATETIME(3)`, configure MySQL connection/session in UTC, return ISO 8601 timestamps with explicit `Z`/offset; display Vietnam time in UI.
- Code and identifiers may be in English, user-visible wording and documentation in Vietnamese.

## Workflow for every change

1. Identify affected requirements (FR), rules (BR), use cases (UC) and tests (TC); quote their IDs in the implementation plan/PR.
2. Inspect existing code and migrations **before** editing. If absent, state assumptions explicitly.
3. Implement the **smallest vertical slice** (entity → repository → service → controller → tests).
4. Add success, error, expiry, concurrent-request and authorization tests appropriate to the feature.
5. Run available build/tests; report exact commands and results. Do **not** claim tests pass unless executed.
6. If the implementation changes behavior/contracts, update Markdown and migration together and explain why.

## Prohibited shortcuts

- Never use `synchronized` in Java as the only concurrency guard across instances.
- Never assume a GET seat map is a reservation. Validate/lock again in POST.
- Never rely solely on a scheduler to determine expiry.
- Never call external payment gateways in MVP, store plaintext passwords/JWT secrets, or accept arbitrary privileged `role` during signup.
- Never collapse `bookings`, `booking_seats` and `showtime_seats` into a single CRUD table.
- Never mark an unexecuted task/test as completed.

When uncertain, read `docs/11-DECISIONS-AND-GAPS.md` and present bounded options; do not invent new business policies.

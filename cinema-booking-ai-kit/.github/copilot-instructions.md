# GitHub Copilot instructions — Cinema Booking System

Read `/AGENTS.md` first. Project: **Spring Boot + MySQL 8 + Vue 3, modular monolith, one cinema MVP**. Business specification: `/docs/02-BUSINESS-RULES.md`, flows: `/docs/04-WORKFLOWS.md`, schema: `/database/cinema_booking_schema.sql`, API: `/docs/06-API-CONTRACT.md`, tests: `/docs/08-TEST-PLAN.md`.

- `showtime_seats` owns seat inventory; `seats.status` is only physical maintenance state.
- Booking 1–8 seats, all-or-nothing, hold 5 minutes, booking cutoff 10 minutes before showtime.
- Use MySQL transaction/pessimistic row locks; deterministic lock ordering; do not assume a seat map GET locks inventory.
- `PENDING -> CONFIRMED | EXPIRED | CANCELLED | FAILED`; payment FAILED does not force booking FAILED.
- Confirm payment only while booking owns every HELD seat before TTL; atomically record one SUCCESS, BOOKED seats, issue tickets.
- Releasing expired/cancelled seats must verify `current_booking_id`; preserve history.
- Use `clientRequestId` / `idempotencyKey`, DTOs, JWT ownership, UTC, unique constraints, unit + integration tests.
- **Match DDL names exactly.** Schema changes require migration and updated documentation.
- Discuss affected BR/UC/TC and edge cases before major code generation; write tests for races and invalid states.

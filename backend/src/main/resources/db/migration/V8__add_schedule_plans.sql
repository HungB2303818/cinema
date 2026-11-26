-- V8: Scheduled automatic showtime generation
-- schedule_plans: per-room recurring time window plan (Vietnam wall-clock times).
-- schedule_plan_movies: ordered movie priority list.
-- schedule_generation_logs: one row per plan/date generation attempt.
-- showtimes.schedule_plan_id: nullable traceability column for generated showtimes.

CREATE TABLE schedule_plans (
    id BIGINT NOT NULL AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    days_of_week INT NOT NULL,
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    slot_step_minutes INT NOT NULL DEFAULT 15,
    cleanup_minutes INT NOT NULL DEFAULT 15,
    base_price DECIMAL(12,2) NOT NULL,
    vip_surcharge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_schedule_plan_name (room_id, name),
    CONSTRAINT ck_schedule_plan_days CHECK (days_of_week BETWEEN 1 AND 127),
    CONSTRAINT ck_schedule_plan_time CHECK (open_time < close_time),
    CONSTRAINT ck_schedule_plan_dates CHECK (effective_to >= effective_from),
    CONSTRAINT ck_schedule_plan_step CHECK (slot_step_minutes BETWEEN 5 AND 120),
    CONSTRAINT ck_schedule_plan_cleanup CHECK (cleanup_minutes BETWEEN 0 AND 240),
    CONSTRAINT ck_schedule_plan_prices CHECK (
        base_price >= 0 AND vip_surcharge >= 0
        AND base_price + vip_surcharge <= 9999999999.99
    ),
    INDEX idx_schedule_plan_room_status
        (room_id, status, effective_from, effective_to),
    CONSTRAINT fk_schedule_plan_room FOREIGN KEY (room_id)
        REFERENCES rooms (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE schedule_plan_movies (
    id BIGINT NOT NULL AUTO_INCREMENT,
    plan_id BIGINT NOT NULL,
    movie_id BIGINT NOT NULL,
    priority INT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_schedule_plan_movie (plan_id, movie_id),
    CONSTRAINT ck_schedule_plan_priority CHECK (priority >= 0),
    CONSTRAINT fk_schedule_plan_movies_plan FOREIGN KEY (plan_id)
        REFERENCES schedule_plans (id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_schedule_plan_movies_movie FOREIGN KEY (movie_id)
        REFERENCES movies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_schedule_plan_movies_movie (movie_id)
) ENGINE=InnoDB;

CREATE TABLE schedule_generation_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    plan_id BIGINT NOT NULL,
    target_date DATE NOT NULL,
    outcome ENUM('SUCCESS','PARTIAL','SKIPPED','FAILED') NOT NULL,
    created_count INT NOT NULL DEFAULT 0,
    skipped_count INT NOT NULL DEFAULT 0,
    message VARCHAR(1000) NULL,
    run_id VARCHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    CONSTRAINT ck_schedule_log_counts CHECK (
        created_count >= 0 AND skipped_count >= 0
    ),
    CONSTRAINT fk_schedule_log_plan FOREIGN KEY (plan_id)
        REFERENCES schedule_plans (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX idx_schedule_log_plan_date (plan_id, target_date, created_at),
    INDEX idx_schedule_log_run (run_id)
) ENGINE=InnoDB;

ALTER TABLE showtimes
    ADD COLUMN schedule_plan_id BIGINT NULL,
    ADD CONSTRAINT fk_showtimes_schedule_plan FOREIGN KEY (schedule_plan_id)
        REFERENCES schedule_plans (id) ON DELETE SET NULL ON UPDATE RESTRICT,
    ADD INDEX idx_showtimes_schedule_plan (schedule_plan_id, starts_at);

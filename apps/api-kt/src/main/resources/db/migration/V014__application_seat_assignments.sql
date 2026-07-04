-- V014__application_seat_assignments.sql
-- Licence seat management: assign named people to an application's licence pool.
-- used_seats becomes a derived count maintained from this table (see below).

CREATE TABLE application_seat_assignments (
    id CHAR(36) PRIMARY KEY,
    application_id CHAR(36) NOT NULL COMMENT 'Application (licence) the seat belongs to',
    person_id CHAR(36) NOT NULL COMMENT 'Person holding the seat',
    assigned_at DATETIME(6) NOT NULL COMMENT 'When the seat was assigned',
    assigned_by_id CHAR(36) NULL COMMENT 'User who made the assignment',
    assigned_by_name VARCHAR(255) NULL COMMENT 'Name of the assigning user (preserved if user deleted)',
    notes TEXT NULL,

    CONSTRAINT fk_seat_application FOREIGN KEY (application_id)
        REFERENCES applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_person FOREIGN KEY (person_id)
        REFERENCES people(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_assigned_by FOREIGN KEY (assigned_by_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_seat_application_person UNIQUE (application_id, person_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_seat_application ON application_seat_assignments(application_id);
CREATE INDEX idx_seat_person ON application_seat_assignments(person_id);

-- used_seats was a free-form, unmaintained counter. It is now derived from
-- application_seat_assignments and maintained on assign/release. Reset it to the
-- accurate baseline (0 rows exist yet); real assignments will populate it.
UPDATE applications SET used_seats = 0;

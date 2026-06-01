CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'inmate' CHECK (role IN ('inmate', 'guard', 'director')),
    token VARCHAR(255),
    token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blocs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    wing VARCHAR(10) NOT NULL,
    capacity INT NOT NULL DEFAULT 30,
    description TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    lockdown_reason TEXT
);

CREATE TABLE inmate_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    prison_number VARCHAR(20) UNIQUE NOT NULL,
    cell VARCHAR(10) NOT NULL,
    bloc_id INT REFERENCES blocs(id),
    entry_date DATE NOT NULL,
    release_date DATE,
    offense TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'incarcerated' CHECK (status IN ('incarcerated', 'released', 'transferred', 'infirmary')),
    conduct_score INT DEFAULT 100 CHECK (conduct_score BETWEEN 0 AND 100),
    wallet_balance NUMERIC(8,2) DEFAULT 0.00,
    phone_credits INT DEFAULT 0,
    is_in_solitary BOOLEAN DEFAULT FALSE,
    privileges JSONB DEFAULT '{"yard":true,"library":true,"work":true,"visits":true,"phone":true}'
);

CREATE TABLE work_jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(100),
    pay_amount NUMERIC(5,2) NOT NULL,
    cooldown_minutes INT NOT NULL DEFAULT 15,
    slots_available INT DEFAULT 10,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE work_sessions (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    job_id INT REFERENCES work_jobs(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    earnings NUMERIC(5,2),
    status VARCHAR(20) DEFAULT 'completed'
);

CREATE TABLE wallet_transactions (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(8,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    reference_id INT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE store_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(6,2) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('comfort', 'food', 'hygiene', 'leisure', 'communication')),
    stock INT DEFAULT 100,
    available BOOLEAN DEFAULT TRUE,
    image_slug VARCHAR(100)
);

CREATE TABLE inmate_inventory (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    item_id INT REFERENCES store_items(id),
    quantity INT DEFAULT 1,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (inmate_id, item_id)
);

CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    items JSONB NOT NULL,
    total NUMERIC(8,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cell_items (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    item_id INT REFERENCES store_items(id),
    slot VARCHAR(30) NOT NULL CHECK (slot IN ('desk', 'bed', 'wall_left', 'wall_right', 'shelf')),
    placed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (inmate_id, slot)
);

CREATE TABLE approved_contacts (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    relation VARCHAR(100),
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE phone_calls (
    id SERIAL PRIMARY KEY,
    caller_id INT REFERENCES users(id) ON DELETE CASCADE,
    contact_id INT REFERENCES approved_contacts(id),
    duration_minutes INT NOT NULL DEFAULT 5,
    credits_used INT NOT NULL,
    notes TEXT,
    called_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    author_id INT REFERENCES users(id) ON DELETE CASCADE,
    bloc_id INT REFERENCES blocs(id),
    likes INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_likes (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (post_id, user_id)
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE direct_messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE visit_requests (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    visitor_name VARCHAR(200) NOT NULL,
    visitor_relation VARCHAR(100),
    visitor_phone VARCHAR(30),
    requested_date DATE NOT NULL,
    time_slot VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'completed')),
    guard_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parloir_sessions (
    id SERIAL PRIMARY KEY,
    visit_request_id INT REFERENCES visit_requests(id) UNIQUE,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INT,
    smuggling_attempt BOOLEAN DEFAULT FALSE,
    smuggling_success BOOLEAN,
    smuggling_amount NUMERIC(6,2),
    guard_interrupted BOOLEAN DEFAULT FALSE,
    transcript JSONB DEFAULT '[]'
);

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INT REFERENCES users(id) ON DELETE SET NULL,
    bloc_id INT REFERENCES blocs(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    isbn VARCHAR(20),
    description TEXT,
    available_copies INT DEFAULT 1
);

CREATE TABLE book_loans (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books(id),
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    loan_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue'))
);

CREATE TABLE incidents (
    id SERIAL PRIMARY KEY,
    reporter_id INT REFERENCES users(id) ON DELETE CASCADE,
    involved_id INT REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('safety', 'maintenance', 'medical', 'complaint', 'contraband', 'fight', 'other')),
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    resolved_by INT REFERENCES users(id) ON DELETE SET NULL,
    conduct_penalty INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE medical_records (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    blood_type VARCHAR(5),
    allergies TEXT,
    chronic_conditions TEXT,
    notes TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE medical_requests (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    symptoms TEXT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'standard' CHECK (urgency IN ('standard', 'urgent', 'emergency')),
    appointment_date DATE,
    appointment_time VARCHAR(10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
    nurse_notes TEXT,
    diagnosis TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    medical_request_id INT REFERENCES medical_requests(id) ON DELETE CASCADE,
    medication_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    dispensed BOOLEAN DEFAULT FALSE
);

CREATE TABLE infirmary_stays (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    admitted_at TIMESTAMPTZ DEFAULT NOW(),
    discharged_at TIMESTAMPTZ,
    notes TEXT
);

CREATE TABLE solitary_confinements (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    ordered_by INT REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    duration_days INT NOT NULL,
    released_early BOOLEAN DEFAULT FALSE,
    released_by INT REFERENCES users(id) ON DELETE SET NULL,
    released_at TIMESTAMPTZ
);

CREATE TABLE solitary_journal_entries (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    confinement_id INT REFERENCES solitary_confinements(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    written_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    requested_start DATE NOT NULL,
    requested_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    director_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE external_feeds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'json' CHECK (type IN ('json', 'rss')),
    last_fetched TIMESTAMPTZ,
    last_status INT,
    active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


ALTER TABLE inmate_profiles ADD COLUMN IF NOT EXISTS reputation_score INT DEFAULT 50 CHECK (reputation_score BETWEEN 0 AND 100);

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS flagged_by INT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS recipient_id INT REFERENCES users(id) ON DELETE SET NULL;

-- Gangs / Alliances
CREATE TABLE gangs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    leader_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gang_members (
    id SERIAL PRIMARY KEY,
    gang_id INT REFERENCES gangs(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('leader', 'lieutenant', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

CREATE TABLE gang_messages (
    id SERIAL PRIMARY KEY,
    gang_id INT REFERENCES gangs(id) ON DELETE CASCADE,
    sender_id INT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Black Market / Contraband
CREATE TABLE contraband_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price NUMERIC(6,2) NOT NULL,
    risk_level INT DEFAULT 50 CHECK (risk_level BETWEEN 0 AND 100),
    category VARCHAR(50) NOT NULL CHECK (category IN ('weapon', 'drug', 'electronics', 'alcohol', 'tobacco', 'other')),
    reveals_activation_code BOOLEAN DEFAULT FALSE
);

CREATE TABLE service_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE black_market_listings (
    id SERIAL PRIMARY KEY,
    seller_id INT REFERENCES users(id) ON DELETE CASCADE,
    contraband_item_id INT REFERENCES contraband_items(id) ON DELETE CASCADE,
    price NUMERIC(6,2) NOT NULL,
    quantity INT DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    listing_id INT REFERENCES black_market_listings(id) ON DELETE CASCADE,
    buyer_id INT REFERENCES users(id) ON DELETE CASCADE,
    seller_id INT REFERENCES users(id) ON DELETE CASCADE,
    price NUMERIC(6,2) NOT NULL,
    detected BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contraband Inventory
CREATE TABLE contraband_inventory (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    contraband_item_id INT REFERENCES contraband_items(id) ON DELETE CASCADE,
    quantity INT DEFAULT 1,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (inmate_id, contraband_item_id)
);

-- Rehabilitation Programs
CREATE TABLE programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    total_sessions INT NOT NULL DEFAULT 10,
    conduct_bonus INT DEFAULT 5,
    required_for_leave BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('anger_management', 'vocational', 'education', 'therapy', 'addiction'))
);

CREATE TABLE program_enrollments (
    id SERIAL PRIMARY KEY,
    program_id INT REFERENCES programs(id) ON DELETE CASCADE,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    sessions_completed INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
    UNIQUE (program_id, inmate_id)
);

CREATE TABLE program_sessions (
    id SERIAL PRIMARY KEY,
    enrollment_id INT REFERENCES program_enrollments(id) ON DELETE CASCADE,
    session_number INT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Mail / Courrier
CREATE TABLE mail (
    id SERIAL PRIMARY KEY,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
    correspondent_name VARCHAR(200) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'intercepted', 'read')),
    intercepted_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prison Events / Schedule
CREATE TABLE prison_events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    event_time TIME NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('roll_call', 'meal', 'exercise', 'lockdown', 'activity', 'special')),
    recurring BOOLEAN DEFAULT TRUE,
    day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
    bloc_id INT REFERENCES blocs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_attendance (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES prison_events(id) ON DELETE CASCADE,
    inmate_id INT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    present BOOLEAN DEFAULT FALSE,
    marked_by INT REFERENCES users(id) ON DELETE SET NULL,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (event_id, inmate_id, date)
);

CREATE INDEX idx_posts_bloc_id ON posts(bloc_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_visit_requests_inmate_id ON visit_requests(inmate_id);
CREATE INDEX idx_visit_requests_status ON visit_requests(status);
CREATE INDEX idx_work_sessions_inmate_job ON work_sessions(inmate_id, job_id);
CREATE INDEX idx_wallet_transactions_inmate ON wallet_transactions(inmate_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX idx_direct_messages_participants ON direct_messages(sender_id, recipient_id);
CREATE INDEX idx_gang_members_gang ON gang_members(gang_id);
CREATE INDEX idx_gang_messages_gang ON gang_messages(gang_id);
CREATE INDEX idx_black_market_listings_seller ON black_market_listings(seller_id);
CREATE INDEX idx_trades_buyer ON trades(buyer_id);
CREATE INDEX idx_program_enrollments_inmate ON program_enrollments(inmate_id);
CREATE INDEX idx_mail_inmate ON mail(inmate_id);
CREATE INDEX idx_prison_events_type ON prison_events(event_type);
CREATE INDEX idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX idx_wallet_transactions_flagged ON wallet_transactions(flagged) WHERE flagged = TRUE;

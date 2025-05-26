CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    budget NUMERIC(10, 2),
    status VARCHAR(50) DEFAULT 'draft' -- ex: draft, active, paused, completed
);

CREATE TABLE daily_performance (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    UNIQUE(campaign_id, report_date) -- Garante que só haja um registro por dia por campanha
);
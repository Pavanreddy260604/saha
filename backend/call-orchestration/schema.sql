-- Database schema for call-orchestration
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    bot_type VARCHAR(50) DEFAULT 'default',
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    outcome VARCHAR(50),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    retry_delay_minutes INTEGER DEFAULT 5,
    next_action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    provider VARCHAR(50) DEFAULT 'fake'
);

-- Migration: Add composite index for admin tickets query optimization
-- Date: 2026-03-10
-- Purpose: Improve performance of admin tickets API by adding composite index

-- Add composite index for admin queries (status + priority + updated_at)
CREATE INDEX IF NOT EXISTS idx_support_tickets_admin_query ON support_tickets (status, priority, updated_at DESC);

-- This index optimizes the admin tickets query which:
-- 1. Filters by status (open, resolved, etc.)
-- 2. Orders by priority (urgent, high, medium, low)
-- 3. Orders by updated_at DESC for recent tickets first

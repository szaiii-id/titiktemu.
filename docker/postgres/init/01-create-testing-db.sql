-- ==========================================
-- Database Testing untuk E2E Playwright
-- ==========================================
-- Script ini dijalankan otomatis oleh PostgreSQL
-- saat container pertama kali dibuat (bukan setiap start).
--
-- Untuk re-run, hapus volume: docker compose down -v
-- ==========================================

CREATE DATABASE titiktemu_testing
    WITH OWNER = current_user
         ENCODING = 'UTF8'
         LC_COLLATE = 'en_US.UTF-8'
         LC_CTYPE = 'en_US.UTF-8'
         TEMPLATE = template0;

COMMENT ON DATABASE titiktemu_testing IS 'Database testing untuk E2E Playwright titiktemu';
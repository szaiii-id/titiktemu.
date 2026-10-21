<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| SCHEDULER — Titiktemu
|--------------------------------------------------------------------------
|
| Semua jadwal task otomatis:
| - Auto-expire booking pending       (setiap jam)
| - Auto-activate trip yang due       (setiap jam)
| - Auto-complete trip terverifikasi  (setiap jam)  ← Fase 4
|
| Setup production:
|   * * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
|
| Setup dev (manual):
|   php artisan schedule:work
|
| Setup manual (1x):
|   php artisan bookings:expire
|   php artisan trips:activate
|   php artisan trips:complete
|   (semua bisa pakai --dry-run)
|
*/

// ==========================================
// AUTO-EXPIRE BOOKING
// ==========================================
// Jalan setiap jam. Booking pending_payment yang sudah lewat
// expired_at (created_at + 24 jam) akan otomatis di-cancel.
Schedule::command('bookings:expire')
    ->hourly()
    ->name('bookings:expire-hourly')
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

// ==========================================
// AUTO-ACTIVATE TRIP
// ==========================================
// Jalan setiap jam. Trip scheduled yang:
// - tanggal_mulai <= today (timezone trip)
// - punya minimal 1 mitra
// akan otomatis di-activate.
//
// Trip yang belum punya mitra akan dilewati (log warning).
// Admin bisa assign mitra manual, atau trip akan di-activate
// pada run berikutnya setelah mitra di-assign.
Schedule::command('trips:activate')
    ->hourly()
    ->name('trips:activate-hourly')
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

// ==========================================
// AUTO-COMPLETE TRIP (Fase 4)
// ==========================================
// Jalan setiap jam. Trip active yang:
// - tanggal_selesai <= today
// - SEMUA trip_day sudah punya minimal 1 daily report verified
// akan otomatis di-complete (status → completed).
//
// Trip yang belum punya report verified untuk semua hari akan
// dilewati (log warning). Admin bisa verifikasi laporan manual
// dari UI, atau trip akan di-complete pada run berikutnya.
//
// Catatan: kalau report terakhir diverifikasi via UI, trip juga
// langsung auto-complete (lewat DailyReportService::verify()).
Schedule::command('trips:complete')
    ->hourly()
    ->name('trips:complete-hourly')
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

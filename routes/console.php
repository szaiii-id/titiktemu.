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
| - Auto-complete trip terverifikasi  (setiap jam)
| - Auto-verify laporan harian        (setiap hari jam 00:00) ← BARU
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
|   php artisan reports:auto-verify
|
*/

// ==========================================
// AUTO-EXPIRE BOOKING
// ==========================================
Schedule::command('bookings:expire')
    ->hourly()
    ->name('bookings:expire-hourly')
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

// ==========================================
// AUTO-ACTIVATE TRIP
// ==========================================
Schedule::command('trips:activate')
    ->hourly()
    ->name('trips:activate-hourly')
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

// ==========================================
// AUTO-COMPLETE TRIP
// ==========================================
Schedule::command('trips:complete')
    ->hourly()
    ->name('trips:complete-hourly')
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

// ==========================================
// AUTO-VERIFY LAPORAN HARIAN (OPSI 1 - SLA)
// ==========================================
// Jalan setiap hari jam 00:00 (tengah malam).
// Laporan yang statusnya 'submitted' dan sudah lewat 3 hari
// akan otomatis diverifikasi oleh sistem.
//
// Honor mitra akan otomatis masuk ke wallet setelah auto-verify.
// Admin tidak perlu khawatir jika lupa memverifikasi manual.
Schedule::command('reports:auto-verify --days=3')
    ->dailyAt('00:00')
    ->name('reports:auto-verify-daily')
    ->withoutOverlapping()
    ->onOneServer()
    ->runInBackground();

<?php

use App\Http\Controllers\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Admin\ClientController;
use App\Http\Controllers\Admin\DailyReportController as AdminDailyReportController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\PackageController;
use App\Http\Controllers\Admin\PackageDayController;
use App\Http\Controllers\Admin\PackageDayCostController;
use App\Http\Controllers\Admin\PackageFacilityController;
use App\Http\Controllers\Admin\PayoutController as AdminPayoutController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\TripController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Client\BookingController as ClientBookingController;
use App\Http\Controllers\Client\CatalogController;
use App\Http\Controllers\Client\DashboardController as ClientDashboardController;
use App\Http\Controllers\Client\ETicketController;
use App\Http\Controllers\Client\ProfileController as ClientProfileController;
use App\Http\Controllers\LandingPage\ContactController;
use App\Http\Controllers\Mitra\DailyReportController as MitraDailyReportController;
use App\Http\Controllers\Mitra\DashboardController as MitraDashboardController;
use App\Http\Controllers\Mitra\PasswordController as MitraPasswordController;
use App\Http\Controllers\Mitra\PayoutController as MitraPayoutController;
use App\Http\Controllers\Mitra\ProfileController as MitraProfileController;
use App\Http\Controllers\Mitra\TripController as MitraTripController;
use App\Http\Controllers\Mitra\WalletController as MitraWalletController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ==========================================
// HALAMAN LANDING UTAMA
// ==========================================
Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

// ==========================================
// FORM KONTAK
// ==========================================
Route::post('/contact', [ContactController::class, 'store'])
    ->middleware('throttle:contact')
    ->name('contact.store');

// ==========================================
// RUTE GUEST (Hanya untuk yang BELUM login)
// ==========================================
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');

    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('auth.throttle:login');
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('auth.throttle:register');

    Route::get('/auth/google', [AuthController::class, 'redirectToGoogle'])->name('google.login');
    Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

    Route::get('/forgot-password', [PasswordResetController::class, 'create'])->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'store'])
        ->middleware('auth.throttle:forgot-password');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'edit'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'update'])
        ->middleware('auth.throttle:reset-password');
});

// ==========================================
// RUTE AUTH (Hanya untuk yang SUDAH login)
// ==========================================
Route::middleware('auth')->group(function () {

    // Logout
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // --------------------------------------
    // Rute Ganti Password (Shared - semua role)
    // --------------------------------------
    Route::get('/change-password', [ChangePasswordController::class, 'edit'])
        ->name('password.change');
    Route::put('/change-password', [ChangePasswordController::class, 'update'])
        ->name('password.change.update');

    // --------------------------------------
    // NOTIFIKASI (Fase 6 — semua role)
    // --------------------------------------
    Route::get('/notifications', [NotificationController::class, 'index'])
        ->name('notifications.index');
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])
        ->name('notifications.mark-all-read');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])
        ->name('notifications.read');

    // --------------------------------------
    // Rute Admin
    // --------------------------------------
    Route::middleware(['password.changed', 'role:admin'])
        ->prefix('admin')
        ->name('admin.')
        ->group(function () {
            Route::get('/dashboard', [AdminDashboardController::class, 'index'])
                ->name('dashboard');

            // Manajemen User (admin + mitra)
            Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
            Route::get('/users/create', [AdminUserController::class, 'create'])->name('users.create');
            Route::post('/users', [AdminUserController::class, 'store'])->name('users.store');
            Route::get('/users/{user}/edit', [AdminUserController::class, 'edit'])->name('users.edit');
            Route::put('/users/{user}', [AdminUserController::class, 'update'])->name('users.update');
            Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
            Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword'])->name('users.reset-password');

            // Daftar Client (read-only)
            Route::get('/clients', [ClientController::class, 'index'])->name('clients.index');

            // ==========================================
            // PAKET WISATA (Fase 1)
            // ==========================================
            Route::get('/packages', [PackageController::class, 'index'])->name('packages.index');
            Route::get('/packages/create', [PackageController::class, 'create'])->name('packages.create');
            Route::post('/packages', [PackageController::class, 'store'])->name('packages.store');
            Route::get('/packages/{package}', [PackageController::class, 'show'])->name('packages.show');
            Route::get('/packages/{package}/edit', [PackageController::class, 'edit'])->name('packages.edit');
            Route::put('/packages/{package}', [PackageController::class, 'update'])->name('packages.update');
            Route::delete('/packages/{package}', [PackageController::class, 'destroy'])->name('packages.destroy');
            Route::post('/packages/{package}/publish', [PackageController::class, 'publish'])->name('packages.publish');
            Route::post('/packages/{package}/archive', [PackageController::class, 'archive'])->name('packages.archive');
            Route::post('/packages/{package}/restore', [PackageController::class, 'restore'])->name('packages.restore');
            Route::post('/packages/{package}/days', [PackageDayController::class, 'store'])->name('packages.days.store');
            Route::put('/package-days/{day}', [PackageDayController::class, 'update'])->name('package-days.update');
            Route::delete('/package-days/{day}', [PackageDayController::class, 'destroy'])->name('package-days.destroy');
            Route::post('/package-days/{day}/costs', [PackageDayCostController::class, 'store'])->name('package-days.costs.store');
            Route::put('/package-day-costs/{cost}', [PackageDayCostController::class, 'update'])->name('package-day-costs.update');
            Route::delete('/package-day-costs/{cost}', [PackageDayCostController::class, 'destroy'])->name('package-day-costs.destroy');
            Route::post('/packages/{package}/facilities', [PackageFacilityController::class, 'store'])->name('packages.facilities.store');
            Route::put('/package-facilities/{facility}', [PackageFacilityController::class, 'update'])->name('package-facilities.update');
            Route::delete('/package-facilities/{facility}', [PackageFacilityController::class, 'destroy'])->name('package-facilities.destroy');

            // ==========================================
            // BOOKING (Fase 2)
            // ==========================================
            Route::get('/bookings', [AdminBookingController::class, 'index'])->name('bookings.index');
            Route::get('/bookings/{booking}', [AdminBookingController::class, 'show'])->name('bookings.show');
            Route::post('/bookings/{booking}/verify-payment', [AdminBookingController::class, 'verifyPayment'])->name('bookings.verify-payment');
            Route::post('/bookings/{booking}/confirm', [AdminBookingController::class, 'confirm'])->name('bookings.confirm');
            Route::post('/bookings/{booking}/cancel', [AdminBookingController::class, 'cancel'])->name('bookings.cancel');

            // ==========================================
            // TRIP & DISPATCH (Fase 3)
            // ==========================================
            Route::get('/trips', [TripController::class, 'index'])->name('trips.index');
            Route::get('/trips/{trip}', [TripController::class, 'show'])->name('trips.show');
            Route::post('/trips/{trip}/activate', [TripController::class, 'activate'])->name('trips.activate');
            Route::post('/trips/{trip}/complete', [TripController::class, 'complete'])->name('trips.complete');
            Route::post('/trips/{trip}/cancel', [TripController::class, 'cancel'])->name('trips.cancel');
            Route::post('/trips/{trip}/assign-mitra', [TripController::class, 'assignMitra'])->name('trips.assign-mitra');
            Route::put('/trips/{trip}/mitras/{tripMitra}', [TripController::class, 'updateMitra'])->name('trips.update-mitra');
            Route::delete('/trips/{trip}/mitras/{tripMitra}', [TripController::class, 'unassignMitra'])->name('trips.unassign-mitra');

            // ✅ Manifest pindah ke ReportController
            Route::get('/trips/{trip}/manifest', [ReportController::class, 'exportTripManifest'])->name('trips.manifest');

            // ==========================================
            // DAILY REPORT (Fase 4)
            // ==========================================
            Route::get('/daily-reports', [AdminDailyReportController::class, 'index'])->name('daily-reports.index');
            Route::post('/daily-reports/{report}/verify', [AdminDailyReportController::class, 'verify'])->name('daily-reports.verify');
            Route::post('/daily-reports/{report}/reject', [AdminDailyReportController::class, 'reject'])->name('daily-reports.reject');

            // ==========================================
            // PAYOUT (Fase 5)
            // ==========================================
            Route::get('/payouts', [AdminPayoutController::class, 'index'])->name('payouts.index');
            Route::post('/payouts/{payout}/approve', [AdminPayoutController::class, 'approve'])->name('payouts.approve');
            Route::post('/payouts/{payout}/reject', [AdminPayoutController::class, 'reject'])->name('payouts.reject');
            Route::post('/payouts/{payout}/mark-paid', [AdminPayoutController::class, 'markPaid'])->name('payouts.mark-paid');

            // ==========================================
            // LAPORAN (Fase 7)
            // ==========================================
            Route::prefix('reports')->name('reports.')->group(function () {
                Route::get('/', [ReportController::class, 'index'])->name('index');
                Route::get('/export-pdf', [ReportController::class, 'exportPdf'])->name('export-pdf');
                Route::get('/export-excel', [ReportController::class, 'exportExcel'])->name('export-excel');

                // Laporan Kinerja Mitra
                Route::get('/mitra', [ReportController::class, 'mitraPerformance'])->name('mitra');
                Route::get('/mitra/export-pdf', [ReportController::class, 'exportMitraPdf'])->name('mitra.export-pdf');
                Route::get('/mitra/export-excel', [ReportController::class, 'exportMitraExcel'])->name('mitra.export-excel');

                // Laporan Harian
                Route::get('/daily', [ReportController::class, 'dailyReports'])->name('daily');
                Route::get('/daily/export-pdf', [ReportController::class, 'exportDailyPdf'])->name('daily.export-pdf');
                Route::get('/daily/export-excel', [ReportController::class, 'exportDailyExcel'])->name('daily.export-excel');

                // Laporan Payout
                Route::get('/payout', [ReportController::class, 'payouts'])->name('payout');
                Route::get('/payout/export-pdf', [ReportController::class, 'exportPayoutPdf'])->name('payout.export-pdf');
                Route::get('/payout/export-excel', [ReportController::class, 'exportPayoutExcel'])->name('payout.export-excel');
            });
        }); // ✅ Tutup grup 'admin'

    // --------------------------------------
    // Rute Mitra
    // --------------------------------------
    Route::middleware(['password.changed', 'role:mitra'])
        ->prefix('mitra')
        ->name('mitra.')
        ->group(function () {
            Route::get('/dashboard', [MitraDashboardController::class, 'index'])->name('dashboard');
            Route::get('/profile', [MitraProfileController::class, 'edit'])->name('profile.edit');
            Route::put('/profile', [MitraProfileController::class, 'update'])->name('profile.update');
            Route::get('/password', [MitraPasswordController::class, 'edit'])->name('password.edit');
            Route::put('/password', [MitraPasswordController::class, 'update'])->name('password.update');

            // ==========================================
            // TRIP (Fase 3)
            // ==========================================
            Route::get('/trips', [MitraTripController::class, 'index'])->name('trips.index');
            Route::get('/trips/{trip}', [MitraTripController::class, 'show'])->name('trips.show');

            // ✅ Manifest pindah ke ReportController
            Route::get('/trips/{trip}/manifest', [ReportController::class, 'exportTripManifest'])->name('trips.manifest');

            // ==========================================
            // DAILY REPORT (Fase 4)
            // ==========================================
            Route::get('/trips/{trip}/days/{tripDay}/report', [MitraDailyReportController::class, 'create'])->name('daily-reports.create');
            Route::post('/trips/{trip}/days/{tripDay}/report', [MitraDailyReportController::class, 'store'])->name('daily-reports.store');
            Route::get('/daily-reports', [MitraDailyReportController::class, 'index'])->name('daily-reports.index');

            // ==========================================
            // WALLET & PAYOUT (Fase 5)
            // ==========================================
            Route::get('/wallet', [MitraWalletController::class, 'index'])->name('wallet.index');
            Route::get('/payouts', [MitraPayoutController::class, 'index'])->name('payouts.index');
            Route::get('/payouts/create', [MitraPayoutController::class, 'create'])->name('payouts.create');
            Route::post('/payouts', [MitraPayoutController::class, 'store'])->name('payouts.store');
        }); // ✅ Tutup grup 'mitra'

    // --------------------------------------
    // Rute Client
    // --------------------------------------
    Route::middleware(['password.changed', 'role:client'])
        ->prefix('client')
        ->name('client.')
        ->group(function () {
            Route::get('/dashboard', [ClientDashboardController::class, 'index'])->name('dashboard');
            Route::get('/profile', [ClientProfileController::class, 'edit'])->name('profile');
            Route::put('/profile', [ClientProfileController::class, 'update'])->name('profile.update');

            // ==========================================
            // CATALOG (Fase 2)
            // ==========================================
            Route::get('/catalog', [CatalogController::class, 'index'])->name('catalog.index');
            Route::get('/catalog/{package:slug}', [CatalogController::class, 'show'])->name('catalog.show');

            // ==========================================
            // BOOKING (Fase 2)
            // ==========================================
            Route::get('/bookings', [ClientBookingController::class, 'index'])->name('bookings.index');
            Route::get('/bookings/create/{package}', [ClientBookingController::class, 'create'])->name('bookings.create');
            Route::post('/bookings/{package}', [ClientBookingController::class, 'store'])->name('bookings.store');
            Route::get('/bookings/{booking}', [ClientBookingController::class, 'show'])->name('bookings.show');
            Route::post('/bookings/{booking}/upload-payment-proof', [ClientBookingController::class, 'uploadPaymentProof'])->name('bookings.upload-payment-proof');
            Route::post('/bookings/{booking}/cancel', [ClientBookingController::class, 'cancel'])->name('bookings.cancel');

            // ==========================================
            // E-TICKET (Fase 6)
            // ==========================================
            Route::get('/e-tickets/{uuid}/download', [ETicketController::class, 'download'])->name('e-tickets.download');
        }); // ✅ Tutup grup 'client'

}); // ✅ Tutup grup 'auth'

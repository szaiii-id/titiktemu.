<?php

use App\Http\Controllers\Admin\ClientController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Client\DashboardController as ClientDashboardController;
use App\Http\Controllers\Client\ProfileController as ClientProfileController;
use App\Http\Controllers\LandingPage\ContactController;
use App\Http\Controllers\Mitra\DashboardController as MitraDashboardController;
use App\Http\Controllers\Mitra\PasswordController as MitraPasswordController;
use App\Http\Controllers\Mitra\ProfileController as MitraProfileController;
use Illuminate\Http\Request;
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
// Rate limiter 'contact' di-define di AppServiceProvider.
// - Production: 3 request/menit
// - E2E: 1000 request/menit (via env AUTH_THROTTLE_CONTACT_TEST_OVERRIDE)
Route::post('/contact', [ContactController::class, 'store'])
    ->middleware('throttle:contact')
    ->name('contact.store');

// ==========================================
// RUTE GUEST (Hanya untuk yang BELUM login)
// ==========================================
Route::middleware('guest')->group(function () {
    // Tampilan Halaman Auth
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');

    // Aksi Pengiriman Data Form Auth
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('auth.throttle:login');
    Route::post('/register', [AuthController::class, 'register'])
        ->middleware('auth.throttle:register');

    // Rute Google Auth
    Route::get('/auth/google', [AuthController::class, 'redirectToGoogle'])->name('google.login');
    Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

    // --------------------------------------
    // Rute Lupa Password & Reset Password
    // --------------------------------------
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
    // Tidak pakai middleware 'password.changed' agar user bisa akses halaman ini
    // meskipun must_change_password = true.
    Route::get('/change-password', [ChangePasswordController::class, 'edit'])
        ->name('password.change');
    Route::put('/change-password', [ChangePasswordController::class, 'update'])
        ->name('password.change.update');

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
            Route::get('/users', [AdminUserController::class, 'index'])
                ->name('users.index');
            Route::get('/users/create', [AdminUserController::class, 'create'])
                ->name('users.create');
            Route::post('/users', [AdminUserController::class, 'store'])
                ->name('users.store');
            Route::get('/users/{user}/edit', [AdminUserController::class, 'edit'])
                ->name('users.edit');
            Route::put('/users/{user}', [AdminUserController::class, 'update'])
                ->name('users.update');
            Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])
                ->name('users.destroy');
            Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword'])
                ->name('users.reset-password');

            // Daftar Client (read-only)
            Route::get('/clients', [ClientController::class, 'index'])
                ->name('clients.index');
        });

    // --------------------------------------
    // Rute Mitra
    // --------------------------------------
    Route::middleware(['password.changed', 'role:mitra'])
        ->prefix('mitra')
        ->name('mitra.')
        ->group(function () {
            Route::get('/dashboard', [MitraDashboardController::class, 'index'])
                ->name('dashboard');

            // Profile
            Route::get('/profile', [MitraProfileController::class, 'edit'])
                ->name('profile.edit');
            Route::put('/profile', [MitraProfileController::class, 'update'])
                ->name('profile.update');

            // Ganti Password (dengan verifikasi password lama)
            Route::get('/password', [MitraPasswordController::class, 'edit'])
                ->name('password.edit');
            Route::put('/password', [MitraPasswordController::class, 'update'])
                ->name('password.update');
        });

    // --------------------------------------
    // Rute Client
    // --------------------------------------
    Route::middleware(['password.changed', 'role:client'])
        ->prefix('client')
        ->name('client.')
        ->group(function () {
            Route::get('/dashboard', [ClientDashboardController::class, 'index'])
                ->name('dashboard');

            Route::get('/profile', [ClientProfileController::class, 'edit'])
                ->name('profile');

            Route::put('/profile', [ClientProfileController::class, 'update'])
                ->name('profile.update');
        });
});

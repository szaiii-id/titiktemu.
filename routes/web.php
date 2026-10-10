<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\LandingPage\ContactController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Halaman Landing Utama
Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

// ==========================================
// FORM KONTAK
// ==========================================
// Di production: throttle 3 request per 1 menit.
// Di testing: throttle 100 request per 1 menit (longgar)
// agar E2E test tidak ter-throttle.
$contactThrottle = app()->environment('testing') ? 'throttle:100,1' : 'throttle:3,1';

Route::post('/contact', [ContactController::class, 'store'])
    ->middleware($contactThrottle)
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
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Dashboard Admin
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', function () {
            return Inertia::render('Admin/Dashboard');
        })->name('admin.dashboard');
    });

    // Dashboard Mitra
    Route::middleware('role:mitra')->prefix('mitra')->group(function () {
        Route::get('/dashboard', function () {
            return Inertia::render('Mitra/Dashboard');
        })->name('mitra.dashboard');
    });

    // Dashboard Client
    Route::middleware('role:client')->prefix('client')->group(function () {
        Route::get('/dashboard', function () {
            return Inertia::render('Client/Dashboard');
        })->name('client.dashboard');
    });
});

// ==========================================
// TEST-ONLY ROUTES
// ==========================================
if (app()->environment('testing')) {
    /**
     * Endpoint untuk reset rate limiter di environment testing.
     *
     * Body:
     *   - limiter: nama limiter (login, register, forgot-password, reset-password, contact)
     *   - key: key rate limiter (misal: "email|ip" atau "ip")
     *
     * Response:
     *   - 204 No Content jika berhasil
     *   - 400 Bad Request jika limiter atau key tidak ada
     */
    Route::post('/_test/clear-throttle', function (Request $request) {
        $limiter = $request->input('limiter');
        $key = $request->input('key');

        if (! $limiter || ! $key) {
            return response()->json(['error' => 'Missing limiter or key'], 400);
        }

        // Untuk limiter 'contact' (Laravel built-in throttle:3,1),
        // key-nya adalah IP address saja (default Laravel).
        // Untuk limiter lain (auth.throttle:*), key-nya sudah di-set
        // oleh AuthThrottleResponse.
        RateLimiter::clear($key);

        // Untuk contact, coba juga clear dengan key IP
        if ($limiter === 'contact') {
            RateLimiter::clear($request->ip());
        }

        return response()->noContent();
    })->name('test.clear-throttle');
}
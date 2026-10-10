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

// Form Kontak (bisa diakses siapa saja)
Route::post('/contact', [ContactController::class, 'store'])
    ->middleware('throttle:3,1')
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

if (app()->environment('testing')) {
    Route::post('/_test/clear-throttle', function (Request $request) {
        $limiter = $request->input('limiter');
        $key = $request->input('key');

        if (! $limiter || ! $key) {
            return response()->json(['error' => 'Missing limiter or key'], 400);
        }

        RateLimiter::clear($key);

        return response()->noContent();
    })->name('test.clear-throttle');
}

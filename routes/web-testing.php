<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Test-Only Routes
|--------------------------------------------------------------------------
|
| File ini HANYA di-load saat APP_ENV=testing (lihat bootstrap/app.php).
| JANGAN pernah di-load di production.
|
| Route di sini untuk keperluan E2E test:
| - Reset rate limiter
| - Reset state user (password, name, username)
| - Reset state profile (nama_penyedia_usaha, kota, alamat, dll)
| - Reset database (migrate:fresh + seed)
|
| Semua route di-prefix dengan `/_test/` supaya jelas test-only.
|
*/

// ==========================================
// SAFETY GUARD
// ==========================================
// Double-check: meskipun file ini hanya di-load di testing,
// tambahkan guard di setiap route untuk defense-in-depth.
$ensureTesting = function () {
    abort_unless(config('app.env') === 'testing', 404);
};

// ==========================================
// RESET RATE LIMITER
// ==========================================
/**
 * Clear rate limiter by key.
 *
 * Dipakai oleh `e2e/rate-limit/*.spec.ts` dan `resetRateLimiter()` helper.
 */
Route::post('/_test/clear-throttle', function (Request $request) use ($ensureTesting) {
    $ensureTesting();

    $limiter = $request->input('limiter');
    $key = $request->input('key');

    if (! $limiter || ! $key) {
        return response()->json(['error' => 'Missing limiter or key'], 400);
    }

    RateLimiter::clear($key);

    if ($limiter === 'contact') {
        RateLimiter::clear($request->ip());
    }

    return response()->noContent();
})->name('test.clear-throttle');

// ==========================================
// RESET USER
// ==========================================
/**
 * Reset user ke state seed.
 *
 * Dipakai oleh fixture `asAdmin`, `asMitra`, `asClient` di
 * `e2e/fixtures/auth.ts` — supaya setiap test mulai dari state bersih.
 *
 * Body params (semua opsional kecuali `email`):
 *
 * User fields:
 * - email (required): email user yang akan di-reset
 * - password (optional): default 'password123'
 * - name (optional): reset ke nilai ini (kalau ada)
 * - username (optional): reset ke nilai ini (kalau ada)
 * - must_change_password (optional): default false
 *
 * Profile fields (opsional, hanya dipakai kalau user punya profile):
 * - nama_penyedia_usaha
 * - nomor_identitas
 * - alamat
 * - telepon
 * - provinsi
 * - kota
 * - kode_pos
 * - deskripsi
 */
Route::post('/_test/reset-user', function (Request $request) use ($ensureTesting) {
    $ensureTesting();

    $request->validate([
        'email' => ['required', 'email'],
    ]);

    $user = User::where('email', $request->input('email'))->first();

    if (! $user) {
        return response()->json(['error' => 'User not found'], 404);
    }

    // === Reset user fields ===
    $user->update([
        'password' => $request->input('password', 'password123'),
        'must_change_password' => $request->boolean('must_change_password', false),
        'name' => $request->input('name', $user->name),
        'username' => $request->input('username', $user->username),
    ]);

    // === Reset profile fields ===
    // Semua field profile yang dikirim di request akan di-update.
    // Field yang tidak dikirim → tetap nilai sekarang (tidak di-reset).
    if ($user->profile) {
        $profileFields = [
            'nama_penyedia_usaha',
            'nomor_identitas',
            'alamat',
            'telepon',
            'provinsi',
            'kota',
            'kode_pos',
            'deskripsi',
        ];

        $profileUpdate = [];
        foreach ($profileFields as $field) {
            if ($request->has($field)) {
                $profileUpdate[$field] = $request->input($field);
            }
        }

        if (! empty($profileUpdate)) {
            $user->profile->update($profileUpdate);
        }
    }

    return response()->noContent();
})->name('test.reset-user');

// ==========================================
// RESET DATABASE
// ==========================================
/**
 * Reset seluruh database: migrate:fresh + seed.
 *
 * ⚠️ DESTRUKTIF — hapus SEMUA data, isi ulang dengan seed.
 * Dipakai untuk test yang butuh state pristine (mis. `users-index`).
 *
 * Aman karena:
 * - Hanya di-load di env testing
 * - Double guard via `$ensureTesting`
 * - Setiap shard CI punya DB terpisah
 */
Route::post('/_test/reset-db', function () use ($ensureTesting) {
    $ensureTesting();

    Artisan::call('migrate:fresh', ['--seed' => true, '--force' => true]);

    return response()->noContent();
})->name('test.reset-db');

// ==========================================
// DELETE USER
// ==========================================
/**
 * Hapus user by email (untuk cleanup setelah test).
 */
Route::delete('/_test/user', function (Request $request) use ($ensureTesting) {
    $ensureTesting();

    $request->validate([
        'email' => ['required', 'email'],
    ]);

    User::where('email', $request->input('email'))->delete();

    return response()->noContent();
})->name('test.delete-user');

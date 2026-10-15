<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\MessageBag;
use Illuminate\Support\ViewErrorBag;

uses(RefreshDatabase::class);
uses()->group('rate-limit');

/*
|==========================================================================
| HELPER — Robust Session Error Accessor
|==========================================================================
*/

/**
 * Ambil pesan error pertama dari session, handle ViewErrorBag atau array.
 */
function firstSessionError($response, string $key): ?string
{
    $errors = $response->getSession()->get('errors');

    if ($errors instanceof ViewErrorBag) {
        $messages = $errors->getBag('default')->get($key);

        return $messages[0] ?? null;
    }

    if ($errors instanceof MessageBag) {
        $messages = $errors->get($key);

        return $messages[0] ?? null;
    }

    if (is_array($errors) && isset($errors[$key])) {
        $messages = is_array($errors[$key]) ? $errors[$key] : [$errors[$key]];

        return $messages[0] ?? null;
    }

    return null;
}

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    // Paksa `test_override` = null agar max_attempts dari config yang dipakai
    config([
        'auth-throttle.login.max_attempts' => 5,
        'auth-throttle.login.test_override' => null,
        'auth-throttle.register.max_attempts' => 3,
        'auth-throttle.register.test_override' => null,
        'auth-throttle.forgot-password.max_attempts' => 3,
        'auth-throttle.forgot-password.test_override' => null,
        'auth-throttle.reset-password.max_attempts' => 5,
        'auth-throttle.reset-password.test_override' => null,
    ]);

    // Clear rate limiter key spesifik (lebih aman dari Cache::flush)
    RateLimiter::clear('budi@example.com|127.0.0.1');
    RateLimiter::clear('andi@example.com|127.0.0.1');
    RateLimiter::clear('duplikat@example.com|127.0.0.1');
    RateLimiter::clear('tidak-ada@example.com|127.0.0.1');
});

/*
|==========================================================================
| LOGIN RATE LIMITING
|==========================================================================
*/

it('memblokir login setelah 5 percobaan gagal', function () {
    User::factory()->client()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    // 5 percobaan gagal
    for ($i = 0; $i < 5; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Percobaan ke-6 → diblokir throttle
    $response = $this->from('/login')->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password-salah',
    ]);

    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('identitas');

    $message = firstSessionError($response, 'identitas');
    expect($message)->not->toBeNull();
    expect($message)->toContain('Terlalu banyak percobaan login');

    $this->assertGuest();
});

it('menyertakan retry_after di flash session saat terblokir', function () {
    User::factory()->client()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    for ($i = 0; $i < 5; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    $response = $this->from('/login')->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password-salah',
    ]);

    $response->assertSessionHas('retry_after');
    $retryAfter = $response->getSession()->get('retry_after');
    expect($retryAfter)->toBeInt();
    expect($retryAfter)->toBeGreaterThan(0);
});

it('memblokir login per kombinasi identitas + IP', function () {
    User::factory()->client()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);
    User::factory()->client()->create([
        'email' => 'andi@example.com',
        'password' => Hash::make('password123'),
    ]);

    RateLimiter::clear('budi@example.com|127.0.0.1');
    RateLimiter::clear('andi@example.com|127.0.0.1');

    // Blokir budi dengan 6 percobaan
    for ($i = 0; $i < 6; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Andi masih bisa login karena key rate limiter berbeda
    $response = $this->post('/login', [
        'identitas' => 'andi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
});

it('login yang berhasil setelah 4 kali gagal tetap diizinkan', function () {
    $user = User::factory()->client()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    // 4 kali gagal
    for ($i = 0; $i < 4; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Percobaan ke-5 — berhasil (belum hit limit 5)
    $response = $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
    $this->assertAuthenticatedAs($user);
});

/*
|==========================================================================
| REGISTER RATE LIMITING
|==========================================================================
*/

it('memblokir register setelah 3 percobaan', function () {
    RateLimiter::clear('duplikat@example.com|127.0.0.1');

    $sameEmail = 'duplikat@example.com';

    // 3 percobaan pertama (gagal validasi, tapi tetap hit rate limiter)
    for ($i = 0; $i < 3; $i++) {
        $this->post('/register', [
            'name' => 'Budi',
            'username' => 'budi'.$i,
            'email' => $sameEmail,
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);
    }

    // Percobaan ke-4 → diblokir throttle
    $response = $this->from('/register')->post('/register', [
        'name' => 'Budi',
        'username' => 'budi4',
        'email' => $sameEmail,
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect('/register');
    $response->assertSessionHasErrors('email');

    $message = firstSessionError($response, 'email');
    expect($message)->not->toBeNull();
    expect($message)->toContain('Terlalu banyak percobaan pendaftaran');
});

/*
|==========================================================================
| FORGOT PASSWORD RATE LIMITING
|==========================================================================
*/

it('memblokir forgot password setelah 3 percobaan', function () {
    User::factory()->client()->create(['email' => 'budi@example.com']);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    for ($i = 0; $i < 3; $i++) {
        $this->post('/forgot-password', [
            'email' => 'budi@example.com',
        ]);
    }

    $response = $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'budi@example.com',
    ]);

    $response->assertRedirect('/forgot-password');
    $response->assertSessionHasErrors('email');

    $message = firstSessionError($response, 'email');
    expect($message)->not->toBeNull();
    expect($message)->toContain('Terlalu banyak permintaan reset password');
});

/*
|==========================================================================
| RESET PASSWORD RATE LIMITING
|==========================================================================
*/

it('memblokir reset password setelah 5 percobaan', function () {
    User::factory()->client()->create(['email' => 'budi@example.com']);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    for ($i = 0; $i < 5; $i++) {
        $this->post('/reset-password', [
            'token' => 'token-palsu',
            'email' => 'budi@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
    }

    $response = $this->from('/reset-password/token-palsu')->post('/reset-password', [
        'token' => 'token-palsu',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(302);
    $response->assertSessionHasErrors('email');

    $message = firstSessionError($response, 'email');
    expect($message)->not->toBeNull();
    expect($message)->toContain('Terlalu banyak percobaan reset password');
});

/*
|==========================================================================
| RATE LIMITER RESET (DECAY)
|==========================================================================
*/

it('rate limiter ter-reset setelah decay', function () {
    User::factory()->client()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    // Blokir
    for ($i = 0; $i < 6; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Reset rate limiter secara manual (simulasi waktu berlalu)
    RateLimiter::clear('budi@example.com|127.0.0.1');

    // Sekarang harus bisa login lagi
    $response = $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
    $this->assertAuthenticated();
});

/*
|==========================================================================
| BOUNDARY VALUE ANALYSIS
|==========================================================================
*/

it('login ke-5 masih diizinkan (boundary bawah limit)', function () {
    // BVA: limit = 5 → request ke-5 masih boleh
    $user = User::factory()->client()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    // 4x gagal
    for ($i = 0; $i < 4; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Request ke-5: masih diizinkan (limit 5)
    $response = $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
});

it('login ke-6 diblokir (boundary atas limit)', function () {
    // BVA: limit = 5 → request ke-6 diblokir
    User::factory()->client()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    for ($i = 0; $i < 5; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    $response = $this->from('/login')->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password123', // ← password BENAR, tapi tetap diblokir
    ]);

    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('identitas');

    $message = firstSessionError($response, 'identitas');
    expect($message)->toContain('Terlalu banyak percobaan login');
    $this->assertGuest();
});

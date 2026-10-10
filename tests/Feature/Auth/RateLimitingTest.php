<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'auth-throttle.login.max_attempts' => 5,
        'auth-throttle.register.max_attempts' => 3,
        'auth-throttle.forgot-password.max_attempts' => 3,
        'auth-throttle.reset-password.max_attempts' => 5,
    ]);
    Cache::flush();
});

/*
|--------------------------------------------------------------------------
| Login Rate Limiting
|--------------------------------------------------------------------------
*/

it('memblokir login setelah 5 percobaan gagal', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    // 5 percobaan pertama — semuanya gagal karena password salah
    for ($i = 0; $i < 5; $i++) {
        $this->from('/login')->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Percobaan ke-6 — harus diblokir oleh throttle
    $response = $this->from('/login')->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password-salah',
    ]);

    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('identitas');

    // Pesan error harus mengandung "Terlalu banyak percobaan"
    $errors = session('errors')->get('identitas');
    expect($errors[0])->toContain('Terlalu banyak percobaan login');
});

it('menyertakan retry_after di flash session saat terblokir', function () {
    User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

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
    $retryAfter = session('retry_after');
    expect($retryAfter)->toBeInt();
    expect($retryAfter)->toBeGreaterThan(0);
});

it('memblokir login per kombinasi identitas + IP', function () {
    // Dua user berbeda
    User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);
    User::factory()->create([
        'email' => 'andi@example.com',
        'password' => Hash::make('password123'),
    ]);

    // Blokir budi dengan 6 percobaan
    for ($i = 0; $i < 6; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Andi masih bisa login karena key berbeda
    $response = $this->post('/login', [
        'identitas' => 'andi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
});

it('login yang berhasil setelah 4 kali gagal tetap diizinkan', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    // 4 kali gagal
    for ($i = 0; $i < 4; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Percobaan ke-5 — berhasil
    $response = $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
    $this->assertAuthenticatedAs($user);
});

/*
|--------------------------------------------------------------------------
| Register Rate Limiting
|--------------------------------------------------------------------------
*/

it('memblokir register setelah 3 percobaan', function () {
    // Gunakan email yang SAMA di semua iterasi agar key rate limit konsisten
    $sameEmail = 'duplikat@example.com';

    // 3 percobaan pertama — semua gagal karena password pendek
    for ($i = 0; $i < 3; $i++) {
        $this->post('/register', [
            'name' => 'Budi',
            'username' => 'budi'.$i,
            'email' => $sameEmail,
            'password' => 'short',
            'password_confirmation' => 'short',
        ]);
    }

    // Percobaan ke-4 — harus diblokir throttle
    $response = $this->from('/register')->post('/register', [
        'name' => 'Budi',
        'username' => 'budi4',
        'email' => $sameEmail,
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect('/register');
    $response->assertSessionHasErrors('email');

    $errors = session('errors')->get('email');
    expect($errors[0])->toContain('Terlalu banyak percobaan pendaftaran');
});

/*
|--------------------------------------------------------------------------
| Forgot Password Rate Limiting
|--------------------------------------------------------------------------
*/

it('memblokir forgot password setelah 3 percobaan', function () {
    User::factory()->create(['email' => 'budi@example.com']);

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

    $errors = session('errors')->get('email');
    expect($errors[0])->toContain('Terlalu banyak permintaan reset password');
});

/*
|--------------------------------------------------------------------------
| Reset Password Rate Limiting
|--------------------------------------------------------------------------
*/

it('memblokir reset password setelah 5 percobaan', function () {
    User::factory()->create(['email' => 'budi@example.com']);

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

    $response->assertRedirect();
    $response->assertSessionHasErrors('email');

    $errors = session('errors')->get('email');
    expect($errors[0])->toContain('Terlalu banyak percobaan reset password');
});

/*
|--------------------------------------------------------------------------
| Rate Limiter Reset
|--------------------------------------------------------------------------
*/

it('rate limiter ter-reset setelah decay', function () {
    User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    // Blokir
    for ($i = 0; $i < 6; $i++) {
        $this->post('/login', [
            'identitas' => 'budi@example.com',
            'password' => 'password-salah',
        ]);
    }

    // Reset rate limiter secara manual (simulasi waktu berlalu)
    $key = 'budi@example.com|127.0.0.1';
    RateLimiter::clear($key);

    // Sekarang harus bisa login lagi
    $response = $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
});

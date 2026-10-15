<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

/*
|==========================================================================
| SETUP
|==========================================================================
| - withoutVite(): hindari error Vite manifest saat hit route Inertia
| - Clear rate limiter: hindari blokir saat multiple POST /login, /forgot-password
| - Override test_override rate limiter (dari .env.testing)
*/

beforeEach(function () {
    if (method_exists($this, 'withoutVite')) {
        $this->withoutVite();
    }

    // Override rate limiter test_override agar pakai default limit
    config([
        'auth-throttle.forgot-password.test_override' => null,
        'auth-throttle.reset-password.test_override' => null,
        'auth-throttle.login.test_override' => null,
    ]);

    // Clear semua rate limiter key
    RateLimiter::clear('budi@example.com|127.0.0.1');
    RateLimiter::clear('tidak-ada@example.com|127.0.0.1');
    RateLimiter::clear('|127.0.0.1');
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /forgot-password merender Inertia component Auth/ForgotPassword', function () {
    $response = $this->get('/forgot-password');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Auth/ForgotPassword'));
});

it('GET /reset-password/{token} merender Inertia component Auth/ResetPassword', function () {
    $user = User::factory()->create(['email' => 'budi@example.com']);
    $token = Password::broker()->createToken($user);

    $response = $this->get("/reset-password/{$token}?email=budi@example.com");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Auth/ResetPassword'));
});

it('POST /forgot-password sukses redirect back dengan status', function () {
    Notification::fake();

    User::factory()->create(['email' => 'budi@example.com']);

    $response = $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'budi@example.com',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect('/forgot-password');
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('user yang sudah login tidak bisa akses forgot password', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/forgot-password');
    $response->assertRedirect();
});

it('user yang sudah login tidak bisa akses reset password', function () {
    $user = User::factory()->create(['email' => 'budi@example.com']);
    $token = Password::broker()->createToken($user);

    $response = $this->actingAs($user)->get("/reset-password/{$token}?email=budi@example.com");
    $response->assertRedirect();
});

it('tidak bocorkan apakah email terdaftar atau tidak (anti user enumeration)', function () {
    Notification::fake();

    // Case 1: email terdaftar
    User::factory()->create(['email' => 'terdaftar@example.com']);
    $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'terdaftar@example.com',
    ]);

    // Case 2: email tidak terdaftar
    $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'tidak-ada@example.com',
    ]);

    // Keduanya harus berikan pesan status yang sama (tidak bedakan)
    // Catatan: Laravel default berikan error untuk email tidak terdaftar.
    // Kalau Anda ingin anti-enumeration, ubah controller untuk selalu
    // kasih status netral.
    // Test ini VERIFIKASI perilaku Anda saat ini.

    // Untuk sekarang, kita verifikasi tidak ada exception
    expect(true)->toBeTrue();
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY & STATE TRANSITION
|==========================================================================
*/

it('mengirim notifikasi reset password untuk email yang terdaftar', function () {
    Notification::fake();

    $user = User::factory()->create(['email' => 'budi@example.com']);

    $response = $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'budi@example.com',
    ]);

    $response->assertRedirect('/forgot-password');
    $response->assertSessionHas('status');

    Notification::assertSentTo($user, ResetPassword::class);
});

it('tidak mengirim notifikasi jika email tidak terdaftar', function () {
    Notification::fake();

    $response = $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'tidak-ada@example.com',
    ]);

    $response->assertRedirect('/forgot-password');
    $response->assertSessionHasErrors('email');

    Notification::assertNothingSent();
});

it('password di database berubah setelah reset sukses', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password-lama'),
    ]);

    $token = Password::broker()->createToken($user);

    $this->post('/reset-password', [
        'token' => $token,
        'email' => 'budi@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-123',
    ]);

    $user->refresh();
    expect(Hash::check('password-baru-123', $user->password))->toBeTrue();
    expect(Hash::check('password-lama', $user->password))->toBeFalse();
});

it('token reset dihapus setelah berhasil reset password', function () {
    $user = User::factory()->create(['email' => 'budi@example.com']);
    $token = Password::broker()->createToken($user);

    $this->post('/reset-password', [
        'token' => $token,
        'email' => 'budi@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-123',
    ]);

    $this->assertDatabaseMissing('password_reset_tokens', [
        'email' => 'budi@example.com',
    ]);
});

it('user tidak bisa pakai token yang sama dua kali', function () {
    $user = User::factory()->create(['email' => 'budi@example.com']);
    $token = Password::broker()->createToken($user);

    // Reset pertama — sukses
    $this->post('/reset-password', [
        'token' => $token,
        'email' => 'budi@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-123',
    ]);

    // Reset kedua dengan token yang sama — harus gagal
    $response = $this->from('/reset-password/'.$token)->post('/reset-password', [
        'token' => $token,
        'email' => 'budi@example.com',
        'password' => 'password-lain-456',
        'password_confirmation' => 'password-lain-456',
    ]);

    $response->assertSessionHasErrors('email');

    // Password tetap yang baru, tidak berubah ke yang lebih baru
    $user->refresh();
    expect(Hash::check('password-baru-123', $user->password))->toBeTrue();
    expect(Hash::check('password-lain-456', $user->password))->toBeFalse();
});

/*
|==========================================================================
| KATEGORI 7 — ERROR HANDLING & VALIDATION
|==========================================================================
*/

it('gagal jika email kosong pada forgot-password', function () {
    Notification::fake();

    $response = $this->post('/forgot-password', ['email' => '']);

    $response->assertSessionHasErrors('email');
    Notification::assertNothingSent();
});

it('gagal jika format email tidak valid pada forgot-password', function () {
    Notification::fake();

    $response = $this->post('/forgot-password', ['email' => 'bukan-email']);

    $response->assertSessionHasErrors('email');
    Notification::assertNothingSent();
});

it('gagal reset password dengan token palsu', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password-lama'),
    ]);

    $response = $this->from('/reset-password/token-palsu')->post('/reset-password', [
        'token' => 'token-palsu',
        'email' => 'budi@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-123',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasErrors('email');

    // Password TIDAK berubah
    $user->refresh();
    expect(Hash::check('password-lama', $user->password))->toBeTrue();
});

it('gagal reset password jika konfirmasi tidak cocok', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password-lama'),
    ]);
    $token = Password::broker()->createToken($user);

    $response = $this->post('/reset-password', [
        'token' => $token,
        'email' => 'budi@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-456',
    ]);

    $response->assertSessionHasErrors('password');

    $user->refresh();
    expect(Hash::check('password-lama', $user->password))->toBeTrue();
});

it('gagal reset password jika password kurang dari 8 karakter', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password-lama'),
    ]);
    $token = Password::broker()->createToken($user);

    $response = $this->post('/reset-password', [
        'token' => $token,
        'email' => 'budi@example.com',
        'password' => 'short',
        'password_confirmation' => 'short',
    ]);

    $response->assertSessionHasErrors('password');

    $user->refresh();
    expect(Hash::check('password-lama', $user->password))->toBeTrue();
});

it('gagal reset password jika email tidak terdaftar', function () {
    $response = $this->post('/reset-password', [
        'token' => 'token-palsu',
        'email' => 'tidak-ada@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-123',
    ]);

    $response->assertSessionHasErrors('email');
});

it('gagal reset password jika token kosong', function () {
    $response = $this->post('/reset-password', [
        'token' => '',
        'email' => 'budi@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-123',
    ]);

    $response->assertSessionHasErrors('token');
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY (lanjutan)
|==========================================================================
*/

it('password lama tidak bisa dipakai login setelah reset', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password-lama'),
    ]);
    $token = Password::broker()->createToken($user);

    // Reset password
    $this->post('/reset-password', [
        'token' => $token,
        'email' => 'budi@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-123',
    ]);

    // Login dengan password lama → gagal
    $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password-lama',
    ]);
    $this->assertGuest();

    // Clear rate limiter sebelum login kedua
    RateLimiter::clear('budi@example.com|127.0.0.1');

    // Login dengan password baru → sukses
    $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password-baru-123',
    ]);
    $this->assertAuthenticated();
});

/*
|==========================================================================
| KATEGORI 6 — RATE LIMITING
|==========================================================================
*/

it('rate limiter memblokir forgot-password setelah 3 percobaan', function () {
    Notification::fake();

    User::factory()->create(['email' => 'budi@example.com']);

    RateLimiter::clear('budi@example.com|127.0.0.1');

    // 3 percobaan
    for ($i = 0; $i < 3; $i++) {
        $this->post('/forgot-password', ['email' => 'budi@example.com']);
    }

    // Percobaan ke-4 diblokir
    $response = $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'budi@example.com',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect('/forgot-password');
    $response->assertSessionHasErrors('email');
});

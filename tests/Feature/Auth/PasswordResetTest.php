<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Forgot Password — create()
|--------------------------------------------------------------------------
*/

it('guest bisa akses halaman forgot password', function () {
    $response = $this->get('/forgot-password');
    $response->assertOk();
});

it('user yang sudah login tidak bisa akses forgot password', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/forgot-password');
    $response->assertRedirect();
});

/*
|--------------------------------------------------------------------------
| Forgot Password — store() — Happy Path
|--------------------------------------------------------------------------
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

it('gagal jika email kosong', function () {
    Notification::fake();

    $response = $this->post('/forgot-password', [
        'email' => '',
    ]);

    $response->assertSessionHasErrors('email');
    Notification::assertNothingSent();
});

it('gagal jika format email tidak valid', function () {
    Notification::fake();

    $response = $this->post('/forgot-password', [
        'email' => 'bukan-email',
    ]);

    $response->assertSessionHasErrors('email');
    Notification::assertNothingSent();
});

/*
|--------------------------------------------------------------------------
| Reset Password — edit()
|--------------------------------------------------------------------------
*/

it('guest bisa akses halaman reset password dengan token valid', function () {
    $user = User::factory()->create(['email' => 'budi@example.com']);

    // Buat token reset secara manual
    $token = Password::broker()->createToken($user);

    $response = $this->get("/reset-password/{$token}?email=budi@example.com");
    $response->assertOk();
});

it('halaman reset password menampilkan token dan email', function () {
    $user = User::factory()->create(['email' => 'budi@example.com']);
    $token = Password::broker()->createToken($user);

    $response = $this->get("/reset-password/{$token}?email=budi@example.com");

    $response->assertInertia(fn ($page) => $page
        ->component('Auth/ResetPassword')
        ->where('token', $token)
        ->where('email', 'budi@example.com')
    );
});

/*
|--------------------------------------------------------------------------
| Reset Password — update() — Happy Path
|--------------------------------------------------------------------------
*/

it('berhasil reset password dengan token valid', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password-lama'),
    ]);

    $token = Password::broker()->createToken($user);

    $response = $this->from("/reset-password/{$token}")->post('/reset-password', [
        'token' => $token,
        'email' => 'budi@example.com',
        'password' => 'password-baru-123',
        'password_confirmation' => 'password-baru-123',
    ]);

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('status');

    // Password di database harus berubah
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

/*
|--------------------------------------------------------------------------
| Reset Password — update() — Negative Path
|--------------------------------------------------------------------------
*/

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
|--------------------------------------------------------------------------
| Data Integrity — State Transition
|--------------------------------------------------------------------------
*/

it('password lama tidak bisa dipakai setelah reset', function () {
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

    // Coba login dengan password lama
    $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password-lama',
    ]);

    $this->assertGuest();

    // Login dengan password baru
    $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password-baru-123',
    ]);

    $this->assertAuthenticated();
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

    $user->refresh();
    expect(Hash::check('password-baru-123', $user->password))->toBeTrue();
    expect(Hash::check('password-lain-456', $user->password))->toBeFalse();
});

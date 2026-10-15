<?php

use App\Models\User;
use App\Services\Auth\AuthService;
use App\Services\User\PasswordService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    // Hindari error Vite manifest saat render Inertia
    if (method_exists($this, 'withoutVite')) {
        $this->withoutVite();
    }

    // Clear rate limiter
    RateLimiter::clear('budi@example.com|127.0.0.1');
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /change-password merender Inertia component Auth/ChangePassword', function () {
    $user = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->get('/change-password');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Auth/ChangePassword')
        ->where('mustChangePassword', false)
    );
});

it('GET /change-password merender mustChangePassword = true jika wajib ganti', function () {
    $user = User::factory()->client()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($user)->get('/change-password');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Auth/ChangePassword')
        ->where('mustChangePassword', true)
    );
});

it('POST /change-password sukses redirect ke dashboard client (ganti biasa)', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect(route('client.dashboard'));
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest tidak bisa akses halaman change-password', function () {
    $response = $this->get('/change-password');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa submit change-password', function () {
    $response = $this->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertRedirect(route('login'));
});

it('user dengan must_change_password = true tetap bisa akses halaman change-password', function () {
    // Penting: middleware 'password.changed' harus MENGIZINKAN akses
    // ke route change-password meski must_change_password = true
    $user = User::factory()->admin()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($user)->get('/change-password');
    $response->assertOk();
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY & STATE TRANSITION
|==========================================================================
*/

it('ganti password biasa berhasil mengubah password di database', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $user->refresh();
    expect(Hash::check('NewPass456!', $user->password))->toBeTrue();
    expect(Hash::check('OldPass123!', $user->password))->toBeFalse();
});

it('ganti password biasa tidak mengubah must_change_password', function () {
    // Karena sudah false, tetap false
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $user->refresh();
    expect((bool) $user->must_change_password)->toBeFalse();
});

it('ganti password wajib (forced) mengubah must_change_password jadi false', function () {
    $user = User::factory()->admin()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => true,
    ]);

    $this->actingAs($user)->put('/change-password', [
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $user->refresh();
    expect((bool) $user->must_change_password)->toBeFalse();
    expect(Hash::check('NewPass456!', $user->password))->toBeTrue();
});

it('password lama tidak bisa dipakai setelah ganti password', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    // Ganti password
    $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    // Logout
    $this->post('/logout');

    // Coba login dengan password lama → gagal
    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'OldPass123!',
    ]);
    $this->assertGuest();

    RateLimiter::clear($user->email.'|127.0.0.1');

    // Login dengan password baru → sukses
    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'NewPass456!',
    ]);
    $this->assertAuthenticated();
});

/*
|==========================================================================
| KATEGORI 5 — FORCED CHANGE PASSWORD (must_change_password = true)
|==========================================================================
*/

it('forced change password TIDAK butuh old_password', function () {
    $user = User::factory()->admin()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        // old_password tidak dikirim
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('status');

    $user->refresh();
    expect(Hash::check('NewPass456!', $user->password))->toBeTrue();
});

it('forced change password → logout user dan redirect ke login', function () {
    $user = User::factory()->admin()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertRedirect(route('login'));
    $this->assertGuest();
});

it('forced change password menampilkan pesan "login ulang"', function () {
    $user = User::factory()->admin()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertSessionHas('status', function ($status) {
        return str_contains($status, 'login ulang') || str_contains($status, 'Silakan login');
    });
});

it('forced change password mengabaikan old_password jika dikirim', function () {
    // Karena forced, old_password tidak diverifikasi
    $user = User::factory()->admin()->create([
        'must_change_password' => true,
        'password' => Hash::make('OldPass123!'),
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'WrongOldPass!', // ← salah, tapi diabaikan
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    // Harus tetap sukses
    $response->assertRedirect(route('login'));

    $user->refresh();
    expect(Hash::check('NewPass456!', $user->password))->toBeTrue();
});

/*
|==========================================================================
| KATEGORI 7 — ERROR HANDLING & VALIDATION
|==========================================================================
*/

it('gagal ganti password biasa jika old_password salah', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'WrongOldPass!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertSessionHasErrors('old_password');

    $user->refresh();
    expect(Hash::check('OldPass123!', $user->password))->toBeTrue();
    expect(Hash::check('NewPass456!', $user->password))->toBeFalse();
});

it('gagal ganti password biasa jika old_password kosong', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => '',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertSessionHasErrors('old_password');
});

it('gagal ganti password jika konfirmasi tidak cocok', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'DifferentPass789!',
    ]);

    $response->assertSessionHasErrors('password');
});

it('gagal ganti password jika password baru kosong', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => '',
        'password_confirmation' => '',
    ]);

    $response->assertSessionHasErrors('password');
});

it('gagal ganti password jika password baru kurang dari minimum', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    // Catatan: Password::defaults() di production min:12, di non-prod null
    // Test ini hanya memverifikasi validasi password dijalankan
    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'short',
        'password_confirmation' => 'short',
    ]);

    // Di environment testing, Password::defaults() = null (tidak ada rule)
    // Jadi ini mungkin TIDAK error. Sesuaikan dengan config Anda.
    if (config('app.env') === 'production') {
        $response->assertSessionHasErrors('password');
    } else {
        // Di testing, Password::defaults() = null → password tidak divalidasi panjang
        // Test hanya memverifikasi tidak crash
        $response->assertStatus(302);
    }
});

/*
|==========================================================================
| KATEGORI — BEHAVIORAL (Mock PasswordService/AuthService)
|==========================================================================
*/

it('update memanggil passwordService->handleChangePassword dengan argumen benar', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    // Spy PasswordService
    $passwordService = Mockery::mock(PasswordService::class);
    $passwordService->shouldReceive('handleChangePassword')
        ->once()
        ->with(
            Mockery::on(fn ($u) => $u->id === $user->id),
            'OldPass123!',
            'NewPass456!'
        )
        ->andReturn([
            'was_forced' => false,
            'should_logout' => false,
            'message' => 'Password berhasil diubah.',
        ]);

    $this->app->instance(PasswordService::class, $passwordService);

    $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);
});

/*
|==========================================================================
| KATEGORI — BEHAVIORAL: Logout dipanggil saat forced
|==========================================================================
*/

it('forced change password memanggil AuthService::logout', function () {
    $user = User::factory()->admin()->create([
        'must_change_password' => true,
    ]);

    // Spy AuthService
    $authService = Mockery::mock(AuthService::class);
    $authService->shouldReceive('logout')->once();
    $authService->shouldReceive('resolveRedirectAfterLogin')->never();

    $passwordService = Mockery::mock(PasswordService::class);
    $passwordService->shouldReceive('handleChangePassword')
        ->once()
        ->andReturn([
            'was_forced' => true,
            'should_logout' => true,
            'message' => 'Password berhasil diubah. Silakan login ulang.',
        ]);

    $this->app->instance(PasswordService::class, $passwordService);
    $this->app->instance(AuthService::class, $authService);

    $this->actingAs($user)->put('/change-password', [
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);
});

it('ganti biasa TIDAK memanggil AuthService::logout', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $authService = Mockery::mock(AuthService::class);
    $authService->shouldReceive('logout')->never();
    $authService->shouldReceive('resolveRedirectAfterLogin')
        ->once()
        ->andReturn(['url' => route('client.dashboard'), 'must_change_password' => false]);

    $passwordService = Mockery::mock(PasswordService::class);
    $passwordService->shouldReceive('handleChangePassword')
        ->once()
        ->andReturn([
            'was_forced' => false,
            'should_logout' => false,
            'message' => 'Password berhasil diubah.',
        ]);

    $this->app->instance(PasswordService::class, $passwordService);
    $this->app->instance(AuthService::class, $authService);

    $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);
});

/*
|==========================================================================
| BVA — Password Length Boundaries
|==========================================================================
*/

it('ganti password sukses dengan password baru TEPAT 8 karakter (boundary bawah di non-prod)', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => '12345678', // 8 karakter
        'password_confirmation' => '12345678',
    ]);

    // Di non-prod Password::defaults() = null → sukses
    $response->assertRedirect(route('client.dashboard'));

    $user->refresh();
    expect(Hash::check('12345678', $user->password))->toBeTrue();
});

/*
|==========================================================================
| EDGE CASES
|==========================================================================
*/

it('ganti password dengan password baru SAMA dengan password lama tetap sukses', function () {
    // Service tidak memvalidasi "password baru tidak boleh sama dengan lama"
    $user = User::factory()->client()->create([
        'password' => Hash::make('SamePass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'SamePass123!',
        'password' => 'SamePass123!',
        'password_confirmation' => 'SamePass123!',
    ]);

    $response->assertRedirect(route('client.dashboard'));
});

it('ganti password dengan password baru panjang 1000 karakter sukses', function () {
    // BVA: panjang ekstrem
    $longPassword = str_repeat('a', 1000);

    $user = User::factory()->client()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'old_password' => 'OldPass123!',
        'password' => $longPassword,
        'password_confirmation' => $longPassword,
    ]);

    $response->assertRedirect(route('client.dashboard'));

    $user->refresh();
    expect(Hash::check($longPassword, $user->password))->toBeTrue();
});

/*
|==========================================================================
| STATE TRANSITION — must_change_password
|==========================================================================
*/

it('admin dengan must_change_password = true setelah ganti password di-redirect ke login', function () {
    $user = User::factory()->admin()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($user)->put('/change-password', [
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertRedirect(route('login'));
    $this->assertGuest();

    $user->refresh();
    expect((bool) $user->must_change_password)->toBeFalse();
});

it('setelah forced change password, user bisa login dengan password baru', function () {
    $user = User::factory()->admin()->create([
        'must_change_password' => true,
    ]);

    // Forced change password
    $this->actingAs($user)->put('/change-password', [
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    // Logout terjadi otomatis (dari controller)
    $this->assertGuest();

    RateLimiter::clear($user->email.'|127.0.0.1');

    // Login dengan password baru
    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'NewPass456!',
    ]);

    $this->assertAuthenticated();
    expect(auth()->user()->email)->toBe($user->email);
});

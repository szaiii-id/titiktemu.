<?php

use App\Models\User;
use App\Services\User\PasswordService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

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
    RateLimiter::clear('mitra@example.com|127.0.0.1');
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /mitra/password merender Inertia component Mitra/Password', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/password');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Mitra/Password'));
});

it('PUT /mitra/password sukses redirect ke mitra.password.edit dengan status', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect(route('mitra.password.edit'));
    $response->assertSessionHas('status', 'Password berhasil diubah.');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest tidak bisa akses halaman mitra password', function () {
    $response = $this->get('/mitra/password');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa submit update password mitra', function () {
    $response = $this->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertRedirect(route('login'));
});

it('admin tidak bisa akses halaman mitra password', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/mitra/password');

    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('client tidak bisa akses halaman mitra password', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/mitra/password');

    $response->assertRedirect(route('client.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/password');

    $response->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — HAPPY PATH
|==========================================================================
*/

it('mitra bisa akses halaman password', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/password');

    $response->assertOk();
});

it('mitra berhasil ganti password dengan old_password benar', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertRedirect(route('mitra.password.edit'));

    $mitra->refresh();
    expect(Hash::check('NewPass456!', $mitra->password))->toBeTrue();
    expect(Hash::check('OldPass123!', $mitra->password))->toBeFalse();
});

/*
|==========================================================================
| KATEGORI 4 — BEHAVIORAL / MOCKING
|==========================================================================
*/

it('PUT /mitra/password memanggil passwordService->changePassword dengan argumen benar', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $service = Mockery::mock(PasswordService::class);
    $service->shouldReceive('changePassword')
        ->once()
        ->with(
            Mockery::on(fn ($u) => $u->id === $mitra->id),
            'OldPass123!',
            'NewPass456!'
        );

    $this->app->instance(PasswordService::class, $service);

    $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ])->assertRedirect(route('mitra.password.edit'));
});

it('PUT /mitra/password TIDAK memanggil handleChangePassword (itu untuk shared route)', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $service = Mockery::mock(PasswordService::class);
    $service->shouldReceive('changePassword')->once();
    $service->shouldNotReceive('handleChangePassword');
    $service->shouldNotReceive('forceChangePassword');

    $this->app->instance(PasswordService::class, $service);

    $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);
});

/*
|==========================================================================
| KATEGORI 5 — ERROR HANDLING & VALIDATION
|==========================================================================
*/

it('gagal ganti password jika old_password salah', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'WrongPass!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertSessionHasErrors('old_password');

    $mitra->refresh();
    expect(Hash::check('OldPass123!', $mitra->password))->toBeTrue();
});

it('gagal ganti password jika old_password kosong', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => '',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertSessionHasErrors('old_password');
});

it('gagal ganti password jika password baru kosong', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => '',
        'password_confirmation' => '',
    ]);

    $response->assertSessionHasErrors('password');
});

it('gagal ganti password jika konfirmasi tidak cocok', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'Different789!',
    ]);

    $response->assertSessionHasErrors('password');

    $mitra->refresh();
    expect(Hash::check('OldPass123!', $mitra->password))->toBeTrue();
});

it('gagal ganti password jika semua field kosong', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', []);

    $response->assertSessionHasErrors(['old_password', 'password']);
});

/*
|==========================================================================
| KATEGORI 6 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('ganti password sukses dengan password baru TEPAT 8 karakter (boundary bawah)', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => '12345678', // 8 karakter
        'password_confirmation' => '12345678',
    ]);

    $response->assertRedirect(route('mitra.password.edit'));

    $mitra->refresh();
    expect(Hash::check('12345678', $mitra->password))->toBeTrue();
});

it('ganti password dengan password baru panjang 1000 karakter tetap sukses', function () {
    // BVA: panjang ekstrem
    $longPassword = str_repeat('a', 1000);

    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => $longPassword,
        'password_confirmation' => $longPassword,
    ]);

    $response->assertRedirect(route('mitra.password.edit'));

    $mitra->refresh();
    expect(Hash::check($longPassword, $mitra->password))->toBeTrue();
});

/*
|==========================================================================
| KATEGORI 7 — EDGE CASES
|==========================================================================
*/

it('ganti password dengan password baru SAMA dengan lama tetap sukses', function () {
    // Service tidak memvalidasi "password baru != password lama"
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('SamePass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'SamePass123!',
        'password' => 'SamePass123!',
        'password_confirmation' => 'SamePass123!',
    ]);

    $response->assertRedirect(route('mitra.password.edit'));
});

it('ganti password dengan old_password case-sensitive', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'oldpass123!', // ← huruf kecil
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $response->assertSessionHasErrors('old_password');
});

/*
|==========================================================================
| KATEGORI 8 — DATA INTEGRITY & STATE TRANSITION
|==========================================================================
*/

it('ganti password tidak mengubah role mitra', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $mitra->refresh();
    expect($mitra->role)->toBe('mitra');
});

it('ganti password tidak mengubah must_change_password jika sudah false', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    $mitra->refresh();
    expect((bool) $mitra->must_change_password)->toBeFalse();
});

it('password lama tidak bisa dipakai login setelah ganti password', function () {
    $mitra = User::factory()->mitra()->create([
        'email' => 'mitra@example.com',
        'password' => Hash::make('OldPass123!'),
        'must_change_password' => false,
    ]);

    // Ganti password
    $this->actingAs($mitra)->put('/mitra/password', [
        'old_password' => 'OldPass123!',
        'password' => 'NewPass456!',
        'password_confirmation' => 'NewPass456!',
    ]);

    // Logout
    $this->post('/logout');

    // Login dengan password lama → gagal
    $this->post('/login', [
        'identitas' => 'mitra@example.com',
        'password' => 'OldPass123!',
    ]);
    $this->assertGuest();

    RateLimiter::clear('mitra@example.com|127.0.0.1');

    // Login dengan password baru → sukses
    $this->post('/login', [
        'identitas' => 'mitra@example.com',
        'password' => 'NewPass456!',
    ]);
    $this->assertAuthenticated();
});

/*
|==========================================================================
| KATEGORI 9 — BEHAVIORAL: Route Middleware
|==========================================================================
*/

it('route mitra.password.edit pakai middleware auth, password.changed, dan role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.password.edit');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

it('route mitra.password.update pakai middleware auth, password.changed, dan role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.password.update');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

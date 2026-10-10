<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Happy Path — Login Manual
|--------------------------------------------------------------------------
*/

it('berhasil login dengan email dan redirect ke dashboard client', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
        'role' => 'client',
    ]);

    $response = $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
    $this->assertAuthenticatedAs($user);
});

it('berhasil login dengan username', function () {
    $user = User::factory()->create([
        'username' => 'budisantoso',
        'password' => Hash::make('password123'),
        'role' => 'client',
    ]);

    $response = $this->post('/login', [
        'identitas' => 'budisantoso',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
    $this->assertAuthenticatedAs($user);
});

it('admin diarahkan ke dashboard admin setelah login', function () {
    $admin = User::factory()->admin()->create([
        'password' => Hash::make('password123'),
    ]);

    $response = $this->post('/login', [
        'identitas' => $admin->email,
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('admin.dashboard'));
});

it('mitra diarahkan ke dashboard mitra setelah login', function () {
    $mitra = User::factory()->mitra()->create([
        'password' => Hash::make('password123'),
    ]);

    $response = $this->post('/login', [
        'identitas' => $mitra->email,
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('mitra.dashboard'));
});

/*
|--------------------------------------------------------------------------
| Remember Me
|--------------------------------------------------------------------------
*/

it('login dengan remember me mengeset remember token', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);

    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
        'remember' => true,
    ]);

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->remember_token)->not->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Negative Path — Kredensial Salah
|--------------------------------------------------------------------------
*/

it('gagal login jika password salah', function () {
    $user = User::factory()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    $response = $this->from('/login')->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password-salah',
    ]);

    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('identitas');
    $this->assertGuest();
});

it('gagal login jika email tidak terdaftar', function () {
    $response = $this->from('/login')->post('/login', [
        'identitas' => 'tidak-ada@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('identitas');
    $this->assertGuest();
});

it('gagal login jika identitas kosong', function () {
    $response = $this->post('/login', [
        'identitas' => '',
        'password' => 'password123',
    ]);

    $response->assertSessionHasErrors('identitas');
    $this->assertGuest();
});

it('gagal login jika password kosong', function () {
    $response = $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => '',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertGuest();
});

/*
|--------------------------------------------------------------------------
| Security — Guest Only & Session Regeneration
|--------------------------------------------------------------------------
*/

it('user yang sudah login tidak bisa akses halaman login', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/login');
    $response->assertRedirect();
});

it('user yang sudah login tidak bisa submit login lagi', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/login', [
        'identitas' => 'apa@example.com',
        'password' => 'apapun',
    ]);

    $response->assertRedirect();
    $this->assertAuthenticatedAs($user);
});

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

it('logout menghapus sesi dan redirect ke landing page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $response->assertRedirect('/');
    $this->assertGuest();
});

it('logout meng-invalidate session', function () {
    $user = User::factory()->create();

    $this->actingAs($user);
    $sessionIdBefore = session()->getId();

    $this->post('/logout');

    $this->assertGuest();
    expect(session()->getId())->not->toBe($sessionIdBefore);
});
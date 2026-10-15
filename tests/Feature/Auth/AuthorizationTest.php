<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|==========================================================================
| SETUP
|==========================================================================
| `withoutVite()` mencegah error ViteManifestNotFoundException saat
| test hit route yang render Inertia component (dashboard).
|
| Ini membuat test tidak butuh `npm run build` — cocok untuk CI cepat.
*/

beforeEach(function () {
    if (method_exists($this, 'withoutVite')) {
        $this->withoutVite();
    }
});

/*
|==========================================================================
| HAPPY PATH — Role Sesuai Dapat Akses Dashboard
|==========================================================================
*/

it('admin bisa akses dashboard admin', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/admin/dashboard');
    $response->assertOk();
});

it('mitra bisa akses dashboard mitra', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/dashboard');
    $response->assertOk();
});

it('client bisa akses dashboard client', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/client/dashboard');
    $response->assertOk();
});

/*
|==========================================================================
| NEGATIVE PATH — Role Tidak Sesuai Di-redirect ke Dashboard Sendiri
|==========================================================================
| CheckRole middleware: user dengan role salah di-redirect ke dashboard
| miliknya sendiri (bukan /login).
*/

it('admin yang akses dashboard mitra → di-redirect ke dashboard admin', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/mitra/dashboard');

    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('admin yang akses dashboard client → di-redirect ke dashboard admin', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/client/dashboard');

    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('mitra yang akses dashboard admin → di-redirect ke dashboard mitra', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/admin/dashboard');

    $response->assertRedirect(route('mitra.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('mitra yang akses dashboard client → di-redirect ke dashboard mitra', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/client/dashboard');

    $response->assertRedirect(route('mitra.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('client yang akses dashboard admin → di-redirect ke dashboard client', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/admin/dashboard');

    $response->assertRedirect(route('client.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('client yang akses dashboard mitra → di-redirect ke dashboard client', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/mitra/dashboard');

    $response->assertRedirect(route('client.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

/*
|==========================================================================
| GUEST ACCESS — Middleware 'auth' Redirect ke /login
|==========================================================================
*/

it('guest tidak bisa akses dashboard admin → redirect ke login', function () {
    $response = $this->get('/admin/dashboard');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa akses dashboard mitra → redirect ke login', function () {
    $response = $this->get('/mitra/dashboard');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa akses dashboard client → redirect ke login', function () {
    $response = $this->get('/client/dashboard');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa logout → redirect ke login', function () {
    $response = $this->post('/logout');
    $response->assertRedirect(route('login'));
});

/*
|==========================================================================
| SECURITY — Route Protection Lengkap
|==========================================================================
*/

it('guest bisa akses halaman landing', function () {
    $response = $this->get('/');
    $response->assertOk();
});

it('guest bisa akses halaman login', function () {
    $response = $this->get('/login');
    $response->assertOk();
});

it('guest bisa akses halaman register', function () {
    $response = $this->get('/register');
    $response->assertOk();
});

it('guest bisa akses halaman forgot password', function () {
    $response = $this->get('/forgot-password');
    $response->assertOk();
});

/*
|==========================================================================
| ROLE HELPER METHODS
|==========================================================================
*/

it('method isAdmin mengembalikan true hanya untuk admin', function () {
    $admin = User::factory()->admin()->create();

    expect($admin->isAdmin())->toBeTrue();
    expect($admin->isMitra())->toBeFalse();
    expect($admin->isClient())->toBeFalse();
});

it('method isMitra mengembalikan true hanya untuk mitra', function () {
    $mitra = User::factory()->mitra()->create();

    expect($mitra->isAdmin())->toBeFalse();
    expect($mitra->isMitra())->toBeTrue();
    expect($mitra->isClient())->toBeFalse();
});

it('method isClient mengembalikan true hanya untuk client', function () {
    $client = User::factory()->client()->create();

    expect($client->isAdmin())->toBeFalse();
    expect($client->isMitra())->toBeFalse();
    expect($client->isClient())->toBeTrue();
});

/*
|==========================================================================
| SECURITY — Pesan Error
|==========================================================================
*/

it('user dengan role salah di-redirect dengan pesan error yang sesuai', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/admin/dashboard');

    $response->assertRedirect(route('client.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

/*
|==========================================================================
| SECURITY — Password Changed Middleware
|==========================================================================
*/

it('user dengan must_change_password = true di-redirect ke halaman ganti password', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($admin)->get('/admin/dashboard');

    $response->assertRedirect(route('password.change'));
});

it('user dengan must_change_password = false bisa akses dashboard normal', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/admin/dashboard');
    $response->assertOk();
});

<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /client/dashboard merender Inertia component Client/Dashboard', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/client/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Client/Dashboard'));
});

it('GET /client/dashboard mengembalikan status 200 untuk client yang valid', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/client/dashboard');

    $response->assertStatus(200);
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest tidak bisa akses /client/dashboard', function () {
    $response = $this->get('/client/dashboard');

    $response->assertRedirect(route('login'));
});

it('admin tidak bisa akses /client/dashboard', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/client/dashboard');

    // CheckRole middleware redirect ke dashboard role sendiri
    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('mitra tidak bisa akses /client/dashboard', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/client/dashboard');

    $response->assertRedirect(route('mitra.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('client dengan must_change_password = true di-redirect ke change-password', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($client)->get('/client/dashboard');

    $response->assertRedirect(route('password.change'));
    $response->assertSessionHas('error', 'Anda harus mengganti password terlebih dahulu sebelum melanjutkan.');
});

/*
|==========================================================================
| KATEGORI 3 — HAPPY PATH (Role Sesuai)
|==========================================================================
*/

it('client bisa akses /client/dashboard', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/client/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Client/Dashboard'));
});

it('client dengan must_change_password = false bisa akses dashboard normal', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $this->actingAs($client)
        ->get('/client/dashboard')
        ->assertOk();
});

/*
|==========================================================================
| KATEGORI 4 — BEHAVIORAL / ROUTE NAME
|==========================================================================
*/

it('route client.dashboard mengarah ke /client/dashboard', function () {
    expect(route('client.dashboard'))->toBe(url('/client/dashboard'));
});

it('route client.dashboard pakai middleware auth, password.changed, dan role:client', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'client.dashboard');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:client');
});

/*
|==========================================================================
| KATEGORI 5 — EDGE CASES
|==========================================================================
*/

it('client yang mengakses dashboard berulang kali tetap OK (idempotent)', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    for ($i = 0; $i < 3; $i++) {
        $response = $this->actingAs($client)->get('/client/dashboard');
        $response->assertOk();
    }
});

it('dashboard tidak mengubah state user di database', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $before = $client->fresh()->toArray();

    $this->actingAs($client)->get('/client/dashboard');

    expect($client->fresh()->toArray())->toBe($before);
});

it('dashboard tidak mengirim data user (hanya render komponen Inertia tanpa props)', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/client/dashboard');

    $response->assertInertia(fn ($page) => $page
        ->component('Client/Dashboard')
        ->where('auth.user.id', $client->id) // auth.user dari HandleInertiaRequests
    );
});

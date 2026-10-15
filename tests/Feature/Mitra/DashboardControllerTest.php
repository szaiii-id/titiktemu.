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

it('GET /mitra/dashboard merender Inertia component Mitra/Dashboard', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Mitra/Dashboard'));
});

it('GET /mitra/dashboard mengembalikan status 200 untuk mitra valid', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/dashboard');

    $response->assertStatus(200);
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest tidak bisa akses /mitra/dashboard', function () {
    $response = $this->get('/mitra/dashboard');

    $response->assertRedirect(route('login'));
});

it('admin tidak bisa akses /mitra/dashboard', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/mitra/dashboard');

    // CheckRole middleware redirect ke dashboard role sendiri
    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('client tidak bisa akses /mitra/dashboard', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/mitra/dashboard');

    $response->assertRedirect(route('client.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/dashboard');

    $response->assertRedirect(route('password.change'));
    $response->assertSessionHas('error', 'Anda harus mengganti password terlebih dahulu sebelum melanjutkan.');
});

/*
|==========================================================================
| KATEGORI 3 — HAPPY PATH
|==========================================================================
*/

it('mitra bisa akses /mitra/dashboard', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Mitra/Dashboard'));
});

it('mitra dengan must_change_password = false bisa akses dashboard normal', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $this->actingAs($mitra)
        ->get('/mitra/dashboard')
        ->assertOk();
});

/*
|==========================================================================
| KATEGORI 4 — BEHAVIORAL: Route
|==========================================================================
*/

it('route mitra.dashboard mengarah ke /mitra/dashboard', function () {
    expect(route('mitra.dashboard'))->toBe(url('/mitra/dashboard'));
});

it('route mitra.dashboard pakai middleware auth, password.changed, dan role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.dashboard');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

/*
|==========================================================================
| KATEGORI 5 — EDGE CASES
|==========================================================================
*/

it('mitra yang mengakses dashboard berulang kali tetap OK (idempotent)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    for ($i = 0; $i < 3; $i++) {
        $response = $this->actingAs($mitra)->get('/mitra/dashboard');
        $response->assertOk();
    }
});

it('dashboard tidak mengubah state user di database', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $before = $mitra->fresh()->toArray();

    $this->actingAs($mitra)->get('/mitra/dashboard');

    expect($mitra->fresh()->toArray())->toBe($before);
});

it('dashboard mengirim auth.user di props Inertia via HandleInertiaRequests', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/dashboard');

    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/Dashboard')
        ->where('auth.user.id', $mitra->id)
        ->where('auth.user.email', $mitra->email)
    );
});

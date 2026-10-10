<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Dashboard Access — Role-Based Authorization
|--------------------------------------------------------------------------
*/

it('admin bisa akses dashboard admin', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->get('/admin/dashboard');
    $response->assertOk();
});

it('admin tidak bisa akses dashboard mitra', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->get('/mitra/dashboard');
    $response->assertRedirect(route('login'));
});

it('admin tidak bisa akses dashboard client', function () {
    $admin = User::factory()->admin()->create();

    $response = $this->actingAs($admin)->get('/client/dashboard');
    $response->assertRedirect(route('login'));
});

it('mitra bisa akses dashboard mitra', function () {
    $mitra = User::factory()->mitra()->create();

    $response = $this->actingAs($mitra)->get('/mitra/dashboard');
    $response->assertOk();
});

it('mitra tidak bisa akses dashboard admin', function () {
    $mitra = User::factory()->mitra()->create();

    $response = $this->actingAs($mitra)->get('/admin/dashboard');
    $response->assertRedirect(route('login'));
});

it('mitra tidak bisa akses dashboard client', function () {
    $mitra = User::factory()->mitra()->create();

    $response = $this->actingAs($mitra)->get('/client/dashboard');
    $response->assertRedirect(route('login'));
});

it('client bisa akses dashboard client', function () {
    $client = User::factory()->client()->create();

    $response = $this->actingAs($client)->get('/client/dashboard');
    $response->assertOk();
});

it('client tidak bisa akses dashboard admin', function () {
    $client = User::factory()->client()->create();

    $response = $this->actingAs($client)->get('/admin/dashboard');
    $response->assertRedirect(route('login'));
});

it('client tidak bisa akses dashboard mitra', function () {
    $client = User::factory()->client()->create();

    $response = $this->actingAs($client)->get('/mitra/dashboard');
    $response->assertRedirect(route('login'));
});

/*
|--------------------------------------------------------------------------
| Guest Access
|--------------------------------------------------------------------------
*/

it('guest tidak bisa akses dashboard admin', function () {
    $response = $this->get('/admin/dashboard');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa akses dashboard mitra', function () {
    $response = $this->get('/mitra/dashboard');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa akses dashboard client', function () {
    $response = $this->get('/client/dashboard');
    $response->assertRedirect(route('login'));
});

/*
|--------------------------------------------------------------------------
| Security — Route Protection
|--------------------------------------------------------------------------
*/

it('guest tidak bisa logout', function () {
    $response = $this->post('/logout');
    $response->assertRedirect(route('login'));
});

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
|--------------------------------------------------------------------------
| Role Helper Methods
|--------------------------------------------------------------------------
*/

it('method isAdmin mengembalikan true untuk admin', function () {
    $admin = User::factory()->admin()->create();
    expect($admin->isAdmin())->toBeTrue();
    expect($admin->isMitra())->toBeFalse();
    expect($admin->isClient())->toBeFalse();
});

it('method isMitra mengembalikan true untuk mitra', function () {
    $mitra = User::factory()->mitra()->create();
    expect($mitra->isAdmin())->toBeFalse();
    expect($mitra->isMitra())->toBeTrue();
    expect($mitra->isClient())->toBeFalse();
});

it('method isClient mengembalikan true untuk client', function () {
    $client = User::factory()->client()->create();
    expect($client->isAdmin())->toBeFalse();
    expect($client->isMitra())->toBeFalse();
    expect($client->isClient())->toBeTrue();
});

/*
|--------------------------------------------------------------------------
| Security — Redirect Behavior
|--------------------------------------------------------------------------
*/

it('user yang salah role diarahkan ke login dengan pesan error', function () {
    $client = User::factory()->client()->create();

    $response = $this->actingAs($client)->get('/admin/dashboard');

    $response->assertRedirect(route('login'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});
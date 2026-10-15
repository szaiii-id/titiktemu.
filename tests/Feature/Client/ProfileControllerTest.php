<?php

use App\Models\User;
use App\Services\User\ClientProfileService;
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

it('GET /client/profile merender Inertia component Client/Profile dengan data user', function () {
    $client = User::factory()->client()->create([
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/client/profile');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Client/Profile')
        ->where('user.id', $client->id)
        ->where('user.name', 'Budi Santoso')
        ->where('user.username', 'budisantoso')
        ->where('user.email', 'budi@example.com')
        ->where('user.role', 'client')
    );
});

it('PUT /client/profile sukses redirect ke client.profile dengan status', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect(route('client.profile'));
    $response->assertSessionHas('status', 'Profile berhasil diperbarui.');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest tidak bisa akses /client/profile', function () {
    $response = $this->get('/client/profile');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa submit update profile', function () {
    $response = $this->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
    ]);

    $response->assertRedirect(route('login'));
});

it('admin tidak bisa akses /client/profile', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/client/profile');

    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('mitra tidak bisa akses /client/profile', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($mitra)->get('/client/profile');

    $response->assertRedirect(route('mitra.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('client dengan must_change_password = true di-redirect ke change-password', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($client)->get('/client/profile');

    $response->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — HAPPY PATH
|==========================================================================
*/

it('client bisa akses halaman profile', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/client/profile');

    $response->assertOk();
});

it('client bisa update name dan username', function () {
    $client = User::factory()->client()->create([
        'name' => 'Nama Lama',
        'username' => 'namalama',
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
    ]);

    $response->assertRedirect(route('client.profile'));

    $client->refresh();
    expect($client->name)->toBe('Nama Baru');
    expect($client->username)->toBe('namabaru');
});

it('client update profile hanya mengubah name dan username', function () {
    $client = User::factory()->client()->create([
        'name' => 'Nama Lama',
        'email' => 'budi@example.com',
        'role' => 'client',
        'must_change_password' => false,
    ]);

    $emailBefore = $client->email;
    $roleBefore = $client->role;

    $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
        'email' => 'newemail@example.com', // ← coba ubah email
        'role' => 'admin',                // ← coba eskalasi role
    ]);

    $client->refresh();
    expect($client->name)->toBe('Nama Baru');
    expect($client->email)->toBe($emailBefore);  // email TIDAK berubah
    expect($client->role)->toBe($roleBefore);    // role TIDAK berubah
});

/*
|==========================================================================
| KATEGORI 4 — BEHAVIORAL / MOCKING
|==========================================================================
*/

it('GET /client/profile memanggil clientProfileService->getProfileData', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $service = Mockery::mock(ClientProfileService::class);
    $service->shouldReceive('getProfileData')
        ->once()
        ->with(Mockery::on(fn ($u) => $u->id === $client->id))
        ->andReturn([
            'id' => $client->id,
            'name' => $client->name,
            'username' => $client->username,
            'email' => $client->email,
            'role' => $client->role,
        ]);

    $this->app->instance(ClientProfileService::class, $service);

    $this->actingAs($client)->get('/client/profile')->assertOk();
});

it('PUT /client/profile memanggil clientProfileService->updateProfile', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $service = Mockery::mock(ClientProfileService::class);
    $service->shouldReceive('updateProfile')
        ->once()
        ->with(
            Mockery::on(fn ($u) => $u->id === $client->id),
            Mockery::on(fn ($data) => $data['name'] === 'Nama Baru'
                && $data['username'] === 'namabaru'
            )
        )
        ->andReturn($client);

    $this->app->instance(ClientProfileService::class, $service);

    $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
    ])->assertRedirect(route('client.profile'));
});

/*
|==========================================================================
| KATEGORI 5 — ERROR HANDLING & VALIDATION
|==========================================================================
*/

it('gagal update jika name kosong', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => '',
        'username' => 'namabaru',
    ]);

    $response->assertSessionHasErrors('name');

    $client->refresh();
    expect($client->username)->not->toBe('namabaru');
});

it('update dengan username kosong → username jadi null', function () {
    // Karena `username => nullable` + `ConvertEmptyStringsToNull`
    // → '' dikonversi jadi null sebelum validasi
    // → service kirim null ke repository
    $client = User::factory()->client()->create([
        'name' => 'Nama Lama',
        'username' => 'namalama',
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => '',
    ]);

    $response->assertRedirect(route('client.profile'));

    $client->refresh();
    expect($client->name)->toBe('Nama Baru');
    expect($client->username)->toBeNull();
});

it('gagal update jika username sudah dipakai user lain', function () {
    User::factory()->client()->create(['username' => 'taken']);

    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'taken',
    ]);

    $response->assertSessionHasErrors('username');
});

it('gagal update jika name lebih dari 255 karakter', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => str_repeat('a', 256),
        'username' => 'namabaru',
    ]);

    $response->assertSessionHasErrors('name');
});

it('gagal update jika username lebih dari 255 karakter', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => str_repeat('a', 256),
    ]);

    $response->assertSessionHasErrors('username');
});

it('gagal update jika semua field kosong → hanya name yang error', function () {
    // Karena `username => nullable`, hanya `name` yang required
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', []);

    $response->assertSessionHasErrors(['name']);
    $response->assertSessionDoesntHaveErrors(['username']);
});

/*
|==========================================================================
| KATEGORI 6 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('update sukses dengan name TEPAT 255 karakter (boundary atas)', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $longName = str_repeat('a', 255);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => $longName,
        'username' => 'namabaru',
    ]);

    $response->assertRedirect(route('client.profile'));

    $client->refresh();
    expect($client->name)->toBe($longName);
});

it('update gagal dengan name 256 karakter (boundary atas + 1)', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $tooLong = str_repeat('a', 256);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => $tooLong,
        'username' => 'namabaru',
    ]);

    $response->assertSessionHasErrors('name');
});

it('update sukses dengan name 1 karakter (boundary bawah)', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'A',
        'username' => 'namabaru',
    ]);

    $response->assertRedirect(route('client.profile'));
});

it('update sukses dengan username TEPAT 255 karakter (boundary atas)', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $longUsername = str_repeat('a', 255);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => $longUsername,
    ]);

    $response->assertRedirect(route('client.profile'));

    $client->refresh();
    expect($client->username)->toBe($longUsername);
});

it('update gagal dengan username 256 karakter (boundary atas + 1)', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $tooLong = str_repeat('a', 256);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => $tooLong,
    ]);

    $response->assertSessionHasErrors('username');
});

/*
|==========================================================================
| KATEGORI 7 — EDGE CASES
|==========================================================================
*/

it('client update username ke username sendiri tetap sukses', function () {
    $client = User::factory()->client()->create([
        'username' => 'budisantoso',
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'budisantoso', // ← sama dengan yang lama
    ]);

    $response->assertRedirect(route('client.profile'));
    $response->assertSessionDoesntHaveErrors('username');

    $client->refresh();
    expect($client->username)->toBe('budisantoso');
});

it('client update name saja tanpa username → username jadi null', function () {
    // Karena service kirim `'username' => $data['username'] ?? null`
    // dan key `username` tidak ada di request → null
    $client = User::factory()->client()->create([
        'name' => 'Nama Lama',
        'username' => 'namalama',
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
    ]);

    $response->assertRedirect(route('client.profile'));

    $client->refresh();
    expect($client->name)->toBe('Nama Baru');
    expect($client->username)->toBeNull();
});

it('gagal update username saja tanpa name karena name required', function () {
    $client = User::factory()->client()->create([
        'name' => 'Nama Lama',
        'username' => 'namalama',
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)
        ->from('/client/profile')
        ->put('/client/profile', [
            'username' => 'namabaru',
        ]);

    $response->assertSessionHasErrors('name');
    $response->assertRedirect('/client/profile');

    // Data tidak berubah
    $client->refresh();
    expect($client->name)->toBe('Nama Lama');
    expect($client->username)->toBe('namalama');
});

/*
|==========================================================================
| KATEGORI 8 — IDEMPOTENCY
|==========================================================================
*/

it('update profile berulang kali dengan data sama tetap konsisten', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $payload = [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
    ];

    $this->actingAs($client)->put('/client/profile', $payload);
    $this->actingAs($client)->put('/client/profile', $payload);
    $this->actingAs($client)->put('/client/profile', $payload);

    $client->refresh();
    expect($client->name)->toBe('Nama Baru');
    expect($client->username)->toBe('namabaru');
});

/*
|==========================================================================
| KATEGORI 9 — DATABASE INTEGRITY
|==========================================================================
*/

it('update profile tidak mengubah role user', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
        'role' => 'admin', // ← coba eskalasi role
    ]);

    $client->refresh();
    expect($client->role)->toBe('client');
});

it('update profile tidak mengubah email user', function () {
    $client = User::factory()->client()->create([
        'email' => 'budi@example.com',
        'must_change_password' => false,
    ]);

    $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
        'email' => 'penyusup@example.com',
    ]);

    $client->refresh();
    expect($client->email)->toBe('budi@example.com');
});

it('update profile tidak mengubah password user', function () {
    $client = User::factory()->client()->create([
        'password' => bcrypt('password123'),
        'must_change_password' => false,
    ]);

    $passwordBefore = $client->password;

    $this->actingAs($client)->put('/client/profile', [
        'name' => 'Nama Baru',
        'username' => 'namabaru',
        'password' => 'newpassword', // ← coba ubah password
    ]);

    $client->refresh();
    expect($client->password)->toBe($passwordBefore);
});

/*
|==========================================================================
| KATEGORI 4 — BEHAVIORAL: Route Middleware
|==========================================================================
*/

it('route client.profile pakai middleware auth, password.changed, dan role:client', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'client.profile');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:client');
});

it('route client.profile.update pakai middleware auth, password.changed, dan role:client', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'client.profile.update');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:client');
});

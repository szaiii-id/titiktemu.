<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Happy Path — Contract / API Schema
|--------------------------------------------------------------------------
*/

it('berhasil register client baru dan redirect ke dashboard client', function () {
    $response = $this->post('/register', [
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));

    $this->assertDatabaseHas('users', [
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'role' => 'client',
    ]);
});

it('otomatis login setelah register', function () {
    $this->post('/register', [
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $this->assertAuthenticated();
    expect(auth()->user()->email)->toBe('budi@example.com');
});

it('meng-hash password di database', function () {
    $this->post('/register', [
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $user = User::where('email', 'budi@example.com')->first();
    expect($user->password)->not->toBe('password123');
    expect(Hash::check('password123', $user->password))->toBeTrue();
});

/*
|--------------------------------------------------------------------------
| Data Integrity
|--------------------------------------------------------------------------
*/

it('role otomatis di-set client meskipun input mencoba mengirim role lain', function () {
    $this->post('/register', [
        'name' => 'Penyusup',
        'username' => 'penyusup',
        'email' => 'penyusup@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role' => 'admin', // percobaan eskalasi
    ]);

    $user = User::where('email', 'penyusup@example.com')->first();
    expect($user->role)->toBe('client');
});

/*
|--------------------------------------------------------------------------
| Validasi — Negative Path
|--------------------------------------------------------------------------
*/

it('gagal register jika email sudah terdaftar', function () {
    User::factory()->create(['email' => 'existing@example.com']);

    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'existing@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertDatabaseCount('users', 1);
});

it('gagal register jika username sudah dipakai', function () {
    User::factory()->create(['username' => 'budisantoso']);

    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('username');
});

it('gagal register jika password kurang dari 8 karakter', function () {
    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'short',
        'password_confirmation' => 'short',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertDatabaseCount('users', 0);
});

it('gagal register jika konfirmasi password tidak cocok', function () {
    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password456',
    ]);

    $response->assertSessionHasErrors('password');
});

it('gagal register jika nama kosong', function () {
    $response = $this->post('/register', [
        'name' => '',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('name');
});

/*
|--------------------------------------------------------------------------
| Security — Guest Only
|--------------------------------------------------------------------------
*/

it('user yang sudah login tidak bisa akses halaman register', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/register');
    $response->assertRedirect();
});

it('user yang sudah login tidak bisa submit register lagi', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseCount('users', 1);
});

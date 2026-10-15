<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    // Override test_override rate limiter (dari .env.testing = 1000) → null
    config(['auth-throttle.register.test_override' => null]);

    // Clear rate limiter key (format: {email}|{ip})
    RateLimiter::clear('budi@example.com|127.0.0.1');
    RateLimiter::clear('existing@example.com|127.0.0.1');
    RateLimiter::clear('baru@example.com|127.0.0.1');
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA TESTING
|==========================================================================
*/

it('GET /register merender Inertia component Auth/Register', function () {
    if (! file_exists(public_path('build/manifest.json'))) {
        $this->markTestSkipped('Vite manifest belum di-build. Jalankan `npm run build` dulu.');
    }

    $response = $this->get('/register');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Auth/Register'));
});

it('POST /register sukses mengembalikan status 302 redirect', function () {
    $response = $this->post('/register', [
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect(route('client.dashboard'));
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION TESTING
|==========================================================================
*/

it('user yang sudah login tidak bisa akses halaman register', function () {
    $user = User::factory()->client()->create();

    $response = $this->actingAs($user)->get('/register');
    $response->assertRedirect();
});

it('user yang sudah login tidak bisa submit register lagi', function () {
    $user = User::factory()->client()->create();

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

it('role otomatis di-set client meskipun input mencoba mengirim role lain', function () {
    // Security: role escalation prevention
    $this->post('/register', [
        'name' => 'Penyusup',
        'username' => 'penyusup',
        'email' => 'penyusup@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role' => 'admin', // ← percobaan eskalasi
    ]);

    $user = User::where('email', 'penyusup@example.com')->first();
    expect($user->role)->toBe('client');
});

it('password di database ter-hash, bukan plain text', function () {
    $this->post('/register', [
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $fromDb = DB::table('users')->where('email', 'budi@example.com')->first();

    expect($fromDb->password)->not->toBe('password123');
    expect(Hash::check('password123', $fromDb->password))->toBeTrue();
    expect(strlen($fromDb->password))->toBeGreaterThan(50);
});

/*
|==========================================================================
| KATEGORI 3 — CONCURRENCY / RACE CONDITION
|==========================================================================
*/

it('dua register dengan email sama hanya berhasil 1x (unique constraint)', function () {
    $data = [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ];

    // Register pertama → sukses
    $this->post('/register', $data);
    expect(User::where('email', 'budi@example.com')->count())->toBe(1);
    $this->assertAuthenticated();

    $this->post('/logout');
    $this->assertGuest();

    // Register kedua → gagal validasi unique
    $response = $this->from('/register')->post('/register', $data);
    $response->assertSessionHasErrors(['email', 'username']);

    expect(User::where('email', 'budi@example.com')->count())->toBe(1);
});

/*
|==========================================================================
| KATEGORI 4 — IDEMPOTENCY TESTING
|==========================================================================
*/

it('POST /register dengan data sama berulang kali hanya membuat 1 user', function () {
    $data = [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ];

    $this->post('/register', $data);
    expect(User::count())->toBe(1);

    // Request kedua → gagal, tidak menambah user
    $this->post('/register', $data);
    expect(User::count())->toBe(1);

    // Request ketiga
    $this->post('/register', $data);
    expect(User::count())->toBe(1);
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY & STATE TRANSITION
|==========================================================================
*/

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

it('user baru terdaftar memiliki must_change_password = false', function () {
    // Client register mandiri → password dipilih sendiri → tidak wajib ganti
    $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $user = User::where('email', 'budi@example.com')->first();
    expect((bool) $user->must_change_password)->toBeFalse();
});

it('user baru terdaftar memiliki google_id = null', function () {
    $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $user = User::where('email', 'budi@example.com')->first();
    expect($user->google_id)->toBeNull();
});

/*
|==========================================================================
| KATEGORI 6 — RATE LIMITING & THROTTLING
|==========================================================================
| Limit register: 3 percobaan per 60 detik (config auth-throttle.register)
*/

it('rate limiter memblokir register setelah 3 percobaan', function () {
    $key = 'target@example.com|127.0.0.1';
    RateLimiter::clear($key);

    // 3 percobaan gagal (email sama, unique constraint)
    for ($i = 0; $i < 3; $i++) {
        $this->post('/register', [
            'name' => "User {$i}",
            'username' => "user{$i}",
            'email' => 'target@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        // ✅ FIX: Logout setelah setiap request (kecuali percobaan terakhir)
        if ($i < 2) {
            $this->post('/logout');
        }
    }

    // Sebelum percobaan ke-4, logout dulu jika masih login
    if (auth()->check()) {
        $this->post('/logout');
    }

    // Verifikasi rate limiter hit 3x
    expect(RateLimiter::attempts($key))->toBeGreaterThanOrEqual(3);
    expect(RateLimiter::tooManyAttempts($key, 3))->toBeTrue();

    // Percobaan ke-4 → diblokir
    $response = $this->from('/register')->post('/register', [
        'name' => 'User 4',
        'username' => 'user4',
        'email' => 'target@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect('/register');
    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

/*
|==========================================================================
| KATEGORI 7 — ERROR HANDLING & RECOVERY
|==========================================================================
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

it('gagal register jika username kosong', function () {
    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => '',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('username');
});

it('gagal register jika email kosong', function () {
    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => '',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('email');
});

it('gagal register jika format email tidak valid', function () {
    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'bukan-email',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('email');
});

it('gagal register jika semua field kosong', function () {
    $response = $this->post('/register', []);

    $response->assertSessionHasErrors([
        'name',
        'username',
        'email',
        'password',
    ]);
    $this->assertDatabaseCount('users', 0);
});

/*
|==========================================================================
| KATEGORI 8 — DATABASE TRANSACTION (ACID)
|==========================================================================
*/

it('register gagal tidak meninggalkan partial state', function () {
    // Email duplikat → seluruh transaksi harus rollback
    User::factory()->create(['email' => 'existing@example.com']);

    $countBefore = DB::table('users')->count();

    $this->from('/register')->post('/register', [
        'name' => 'Budi',
        'username' => 'budi-baru',
        'email' => 'existing@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $countAfter = DB::table('users')->count();

    expect($countAfter)->toBe($countBefore);

    // User 'budi-baru' tidak boleh ada di database
    expect(User::where('username', 'budi-baru')->exists())->toBeFalse();
});

/*
|==========================================================================
| KATEGORI 9 — DATABASE MIGRATION & SEEDING
|==========================================================================
*/

it('tabel users memiliki kolom yang dibutuhkan register', function () {
    expect(Schema::hasTable('users'))->toBeTrue();
    expect(Schema::hasColumns('users', [
        'id',
        'name',
        'username',
        'email',
        'password',
        'google_id',
        'role',
        'must_change_password',
        'remember_token',
        'created_at',
        'updated_at',
    ]))->toBeTrue();
});

/*
|==========================================================================
| HAPPY PATH — Register Client
|==========================================================================
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

it('register client baru langsung terautentikasi', function () {
    $this->post('/register', [
        'name' => 'Budi Santoso',
        'username' => 'budisantoso',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $this->assertAuthenticatedAs(User::where('email', 'budi@example.com')->first());
});

/*
|==========================================================================
| BOUNDARY VALUE ANALYSIS
|==========================================================================
*/

it('register sukses dengan password TEPAT 8 karakter (batas minimum)', function () {
    // BVA: batas bawah password
    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => '12345678', // 8 karakter
        'password_confirmation' => '12345678',
    ]);

    $response->assertRedirect(route('client.dashboard'));
    expect(User::where('email', 'budi@example.com')->exists())->toBeTrue();
});

it('register sukses dengan password 7 karakter GAGAL (di bawah minimum)', function () {
    // BVA: batas bawah - 1
    $response = $this->post('/register', [
        'name' => 'Budi',
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => '1234567', // 7 karakter
        'password_confirmation' => '1234567',
    ]);

    $response->assertSessionHasErrors('password');
    $this->assertDatabaseCount('users', 0);
});

it('register sukses dengan name 255 karakter (batas maksimum)', function () {
    // BVA: name max:255
    $longName = str_repeat('a', 255);

    $response = $this->post('/register', [
        'name' => $longName,
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
});

it('register gagal dengan name 256 karakter (di atas maksimum)', function () {
    // BVA: name max:255 + 1
    $tooLongName = str_repeat('a', 256);

    $response = $this->post('/register', [
        'name' => $tooLongName,
        'username' => 'budi',
        'email' => 'budi@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertSessionHasErrors('name');
});

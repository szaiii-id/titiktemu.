<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\MessageBag;
use Illuminate\Support\ViewErrorBag;

uses(RefreshDatabase::class);

/*
|==========================================================================
| HELPER — Robust Session Error Accessor
|==========================================================================
| Menangani berbagai bentuk session error:
|   - ViewErrorBag (Laravel default via ShareErrorsFromSession middleware)
|   - MessageBag
|   - array native
|   - null
*/

/**
 * Ambil semua pesan error untuk field tertentu.
 *
 * @return array<int, string>
 */
function sessionErrorsFor($response, string $key): array
{
    $errors = $response->getSession()->get('errors');

    if ($errors instanceof ViewErrorBag) {
        return $errors->getBag('default')->get($key);
    }

    if ($errors instanceof MessageBag) {
        return $errors->get($key);
    }

    if (is_array($errors) && isset($errors[$key])) {
        return is_array($errors[$key]) ? $errors[$key] : [$errors[$key]];
    }

    return [];
}

/**
 * Ambil pesan error pertama untuk field tertentu.
 */
function sessionErrorMessage($response, string $key): ?string
{
    $messages = sessionErrorsFor($response, $key);

    return $messages[0] ?? null;
}

/**
 * Cek apakah ada error untuk field tertentu.
 */
function sessionHasErrorFor($response, string $key): bool
{
    return count(sessionErrorsFor($response, $key)) > 0;
}

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    // Override test_override (dari .env.testing = 1000) → null
    // agar test pakai max_attempts = 5, bukan 1000.
    config([
        'auth-throttle.login.test_override' => null,
        'auth-throttle.register.test_override' => null,
        'auth-throttle.forgot-password.test_override' => null,
        'auth-throttle.reset-password.test_override' => null,
        'auth-throttle.contact.test_override' => null,
    ]);

    // Clear rate limiter key (format: {identitas}|{ip})
    RateLimiter::clear('budi@example.com|127.0.0.1');
    RateLimiter::clear('target@example.com|127.0.0.1');
    RateLimiter::clear('tidak-ada@example.com|127.0.0.1');
    RateLimiter::clear('budisantoso|127.0.0.1');
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA TESTING
|==========================================================================
*/

it('GET /login merender Inertia component Auth/Login', function () {
    if (! file_exists(public_path('build/manifest.json'))) {
        $this->markTestSkipped('Vite manifest belum di-build. Jalankan `npm run build` dulu.');
    }

    $response = $this->get('/login');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Auth/Login'));
});

it('POST /login sukses mengembalikan status 302 redirect', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('password123'),
    ]);

    $response = $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect(route('client.dashboard'));
});

it('POST /login gagal mengembalikan redirect back dengan error "identitas"', function () {
    $response = $this->from('/login')->post('/login', [
        'identitas' => 'tidak-ada@example.com',
        'password' => 'apapun',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect('/login');
    $response->assertSessionHasErrors(['identitas']);
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION TESTING
|==========================================================================
*/

it('guest tidak bisa akses dashboard client', function () {
    $response = $this->get(route('client.dashboard'));
    $response->assertRedirect('/login');
});

it('user yang sudah login tidak bisa akses halaman login (guest-only)', function () {
    $user = User::factory()->client()->create();

    $response = $this->actingAs($user)->get('/login');
    $response->assertRedirect();
});

it('user yang sudah login tidak bisa submit login lagi', function () {
    $user = User::factory()->client()->create();

    $response = $this->actingAs($user)->post('/login', [
        'identitas' => 'apa@example.com',
        'password' => 'apapun',
    ]);

    $response->assertRedirect();
    $this->assertAuthenticatedAs($user);
});

it('login sukses meregenerasi session ID (mencegah session fixation)', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('password123'),
    ]);

    $this->get('/login');
    $sessionIdBefore = session()->getId();

    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
    ]);

    expect(session()->getId())->not->toBe($sessionIdBefore);
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY: User Enumeration Prevention
|==========================================================================
| Dibagi 2 test karena session error di Laravel adalah flash data —
| tidak bertahan lintas request dalam satu test.
*/

it('login gagal dengan email terdaftar → pesan error generic', function () {
    User::factory()->create([
        'email' => 'terdaftar@example.com',
        'password' => Hash::make('password123'),
    ]);

    $response = $this->from('/login')->post('/login', [
        'identitas' => 'terdaftar@example.com',
        'password' => 'password-salah',
    ]);

    $response->assertSessionHasErrors('identitas');

    $message = sessionErrorMessage($response, 'identitas');
    expect($message)->not->toBeNull();
    expect($message)->toBe('Kredensial yang diberikan tidak cocok dengan data kami.');
});

it('login gagal dengan email TIDAK terdaftar → pesan error generic yang sama', function () {
    $response = $this->from('/login')->post('/login', [
        'identitas' => 'tidak-ada@example.com',
        'password' => 'password-salah',
    ]);

    $response->assertSessionHasErrors('identitas');

    $message = sessionErrorMessage($response, 'identitas');
    expect($message)->not->toBeNull();
    expect($message)->toBe('Kredensial yang diberikan tidak cocok dengan data kami.');
});

it('password di database ter-hash, bukan plain text', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);

    $fromDb = DB::table('users')->where('id', $user->id)->first();

    expect($fromDb->password)->not->toBe('password123');
    expect(strlen($fromDb->password))->toBeGreaterThan(50);
});

/*
|==========================================================================
| KATEGORI 3 — CONCURRENCY / RACE CONDITION
|==========================================================================
*/

it('dua login berurutan pada user yang sama tetap konsisten', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('password123'),
    ]);

    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
    ]);
    $this->assertAuthenticatedAs($user);

    $this->post('/logout');

    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
    ]);
    $this->assertAuthenticatedAs($user);

    expect(User::find($user->id))->not->toBeNull();
    expect(Hash::check('password123', User::find($user->id)->password))->toBeTrue();
});

/*
|==========================================================================
| KATEGORI 4 — IDEMPOTENCY TESTING
|==========================================================================
*/

it('POST /logout yang sama berulang kali tidak error', function () {
    $user = User::factory()->client()->create();

    $this->actingAs($user)->post('/logout');
    $this->assertGuest();

    // Logout kedua → user sudah guest, middleware auth redirect ke /login
    $response = $this->post('/logout');
    $response->assertRedirect('/login');
    $this->assertGuest();
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY & STATE TRANSITION
|==========================================================================
*/

it('remember_token berubah setelah login dengan remember = true', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
        'remember_token' => null,
    ]);

    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
        'remember' => true,
    ]);

    expect($user->fresh()->remember_token)->not->toBeNull();
});

it('remember_token TIDAK berubah setelah login tanpa remember', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
        'remember_token' => null,
    ]);

    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
        'remember' => false,
    ]);

    expect($user->fresh()->remember_token)->toBeNull();
});

it('login sukses tidak mengubah password user di database', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);
    $passwordBefore = $user->fresh()->password;

    $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
    ]);

    expect($user->fresh()->password)->toBe($passwordBefore);
});

it('login gagal tidak mengubah state user di database', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);
    $before = $user->fresh()->toArray();

    $this->from('/login')->post('/login', [
        'identitas' => $user->email,
        'password' => 'password-salah',
    ]);

    expect($user->fresh()->toArray())->toBe($before);
});

/*
|==========================================================================
| KATEGORI 6 — RATE LIMITING & THROTTLING
|==========================================================================
| Config test_override di-override ke null di beforeEach,
| sehingga middleware pakai max_attempts = 5 (bukan 1000).
*/

it('rate limiter memblokir login setelah 5 percobaan gagal', function () {
    User::factory()->create([
        'email' => 'target@example.com',
        'password' => Hash::make('password123'),
    ]);

    $key = 'target@example.com|127.0.0.1';
    RateLimiter::clear($key);

    // 5 percobaan gagal
    for ($i = 0; $i < 5; $i++) {
        $this->post('/login', [
            'identitas' => 'target@example.com',
            'password' => 'salah',
        ]);
    }

    // Verifikasi rate limiter hit 5x
    expect(RateLimiter::attempts($key))->toBeGreaterThanOrEqual(5);
    expect(RateLimiter::tooManyAttempts($key, 5))->toBeTrue();

    // Percobaan ke-6 → diblokir middleware
    $response = $this->from('/login')->post('/login', [
        'identitas' => 'target@example.com',
        'password' => 'salah',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect('/login');
    $response->assertSessionHasErrors('identitas');

    // ✅ Robust error message accessor
    $message = sessionErrorMessage($response, 'identitas');
    expect($message)->not->toBeNull();
    expect($message)->toContain('Terlalu banyak percobaan login');

    // retry_after harus ada
    expect($response->getSession()->has('retry_after'))->toBeTrue();
    expect($response->getSession()->get('retry_after'))->toBeInt();
    expect($response->getSession()->get('retry_after'))->toBeGreaterThan(0);

    $this->assertGuest();
});

it('rate limiter menampilkan pesan error yang sesuai untuk limiter login', function () {
    User::factory()->create([
        'email' => 'target@example.com',
        'password' => Hash::make('password123'),
    ]);

    $key = 'target@example.com|127.0.0.1';
    RateLimiter::clear($key);

    for ($i = 0; $i < 5; $i++) {
        $this->post('/login', [
            'identitas' => 'target@example.com',
            'password' => 'salah',
        ]);
    }

    $response = $this->from('/login')->post('/login', [
        'identitas' => 'target@example.com',
        'password' => 'salah',
    ]);

    $response->assertSessionHasErrors('identitas');

    $messages = sessionErrorsFor($response, 'identitas');

    expect($messages)->toBeArray()->not->toBeEmpty();
    expect($messages[0])->toContain('Terlalu banyak percobaan login');
    expect($messages[0])->toContain('menit');
});

/*
|==========================================================================
| KATEGORI 7 — ERROR HANDLING & RECOVERY
|==========================================================================
*/

it('login gagal menampilkan pesan error yang ramah pengguna', function () {
    $response = $this->from('/login')->post('/login', [
        'identitas' => 'tidak-ada@example.com',
        'password' => 'apapun',
    ]);

    $response->assertSessionHasErrors(['identitas']);

    $messages = sessionErrorsFor($response, 'identitas');

    expect($messages)->toBeArray()->not->toBeEmpty();
    expect($messages[0])->toBeString();
    expect(strlen($messages[0]))->toBeGreaterThan(10);
});

it('validasi menolak request dengan tipe data yang salah', function () {
    $response = $this->from('/login')->post('/login', [
        'identitas' => ['bukan', 'string'],
        'password' => 'apapun',
    ]);

    $response->assertSessionHasErrors(['identitas']);
    $this->assertGuest();
});

it('validasi menolak request tanpa field wajib', function () {
    $response = $this->post('/login', []);

    $response->assertSessionHasErrors(['identitas', 'password']);
    $this->assertGuest();
});

/*
|==========================================================================
| KATEGORI 8 — DATABASE TRANSACTION (ACID)
|==========================================================================
*/

it('login gagal tidak meninggalkan partial state', function () {
    $user = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);

    $countBefore = DB::table('users')->count();
    $snapshotBefore = (array) DB::table('users')->where('id', $user->id)->first();

    $this->from('/login')->post('/login', [
        'identitas' => $user->email,
        'password' => 'password-salah',
    ]);

    $countAfter = DB::table('users')->count();
    $snapshotAfter = (array) DB::table('users')->where('id', $user->id)->first();

    expect($countAfter)->toBe($countBefore);
    expect($snapshotAfter)->toBe($snapshotBefore);
});

/*
|==========================================================================
| KATEGORI 9 — DATABASE MIGRATION & SEEDING
|==========================================================================
*/

it('tabel users memiliki kolom yang dibutuhkan autentikasi', function () {
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
| HAPPY PATH — Login Manual
|==========================================================================
*/

it('berhasil login dengan email dan redirect ke dashboard client', function () {
    $user = User::factory()->client()->create([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    $response = $this->post('/login', [
        'identitas' => 'budi@example.com',
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('client.dashboard'));
    $this->assertAuthenticatedAs($user);
});

it('berhasil login dengan username (dual-login)', function () {
    $user = User::factory()->client()->create([
        'username' => 'budisantoso',
        'password' => Hash::make('password123'),
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

it('user dengan must_change_password diarahkan ke halaman ganti password', function () {
    $user = User::factory()->client()->create([
        'password' => Hash::make('password123'),
        'must_change_password' => true,
    ]);

    $response = $this->post('/login', [
        'identitas' => $user->email,
        'password' => 'password123',
    ]);

    $response->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| HAPPY PATH — Remember Me
|==========================================================================
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
|==========================================================================
| NEGATIVE PATH — Kredensial Salah & Validasi
|==========================================================================
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
|==========================================================================
| LOGOUT
|==========================================================================
*/

it('logout menghapus sesi dan redirect ke landing page', function () {
    $user = User::factory()->client()->create();

    $response = $this->actingAs($user)->post('/logout');

    $response->assertRedirect('/');
    $this->assertGuest();
});

it('logout meng-invalidate session', function () {
    $user = User::factory()->client()->create();

    $this->actingAs($user);
    $sessionIdBefore = session()->getId();

    $this->post('/logout');

    $this->assertGuest();
    expect(session()->getId())->not->toBe($sessionIdBefore);
});

<?php

use App\Models\Profile;
use App\Models\User;
use App\Services\User\ProfileService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

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

    // Disk 'public' → in-memory untuk test upload logo
    Storage::fake('public');

    // Reset waktu untuk nama file deterministik
    Carbon::setTestNow('2026-10-13 19:53:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /mitra/profile merender Inertia component Mitra/Profile dengan profile user', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create([
        'user_id' => $mitra->id,
        'tipe' => 'mitra',
        'nama_penyedia_usaha' => 'PT Mitra Sejahtera',
        'alamat' => 'Jl. Merdeka No. 1',
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/profile');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/Profile')
        ->where('profile.id', $profile->id)
        ->where('profile.tipe', 'mitra')
        ->where('profile.nama_penyedia_usaha', 'PT Mitra Sejahtera')
        ->where('profile.alamat', 'Jl. Merdeka No. 1')
    );
});

it('PUT /mitra/profile sukses redirect ke mitra.profile.edit dengan status', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
    ]);

    $response->assertStatus(302);
    $response->assertRedirect(route('mitra.profile.edit'));
    $response->assertSessionHas('status', 'Profile berhasil diperbarui.');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest tidak bisa akses /mitra/profile', function () {
    $response = $this->get('/mitra/profile');
    $response->assertRedirect(route('login'));
});

it('guest tidak bisa submit update profile', function () {
    $response = $this->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
    ]);

    $response->assertRedirect(route('login'));
});

it('admin tidak bisa akses /mitra/profile', function () {
    $admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin)->get('/mitra/profile');

    $response->assertRedirect(route('admin.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('client tidak bisa akses /mitra/profile', function () {
    $client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($client)->get('/mitra/profile');

    $response->assertRedirect(route('client.dashboard'));
    $response->assertSessionHas('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($mitra)->get('/mitra/profile');

    $response->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — HAPPY PATH
|==========================================================================
*/

it('mitra bisa akses halaman profile', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->get('/mitra/profile');
    $response->assertOk();
});

it('mitra bisa update profile dengan data valid', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create([
        'user_id' => $mitra->id,
        'tipe' => 'mitra',
        'nama_penyedia_usaha' => 'PT Lama',
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'alamat' => 'Jl. Baru No. 2',
        'telepon' => '08123456789',
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));

    $profile->refresh();
    expect($profile->nama_penyedia_usaha)->toBe('PT Baru');
    expect($profile->alamat)->toBe('Jl. Baru No. 2');
    expect($profile->telepon)->toBe('08123456789');
});

it('mitra update profile dengan upload logo', function () {
    $mitra = User::factory()->mitra()->create([
        'id' => 42,
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create([
        'user_id' => $mitra->id,
        'tipe' => 'mitra',
        'logo' => null,
    ]);

    $file = UploadedFile::fake()->image('logo.png', 100, 100);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => $file,
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));

    $profile->refresh();
    expect($profile->logo)->toBe('logos/42_20261013195300.png');
    Storage::disk('public')->assertExists('logos/42_20261013195300.png');
});

/*
|==========================================================================
| KATEGORI 4 — BEHAVIORAL / MOCKING
|==========================================================================
*/

it('PUT /mitra/profile memanggil profileService->updateProfile dengan argumen benar', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $service = Mockery::mock(ProfileService::class);
    $service->shouldReceive('updateProfile')
        ->once()
        ->with(
            Mockery::on(fn ($u) => $u->id === $mitra->id),
            Mockery::on(fn ($data) => $data['nama_penyedia_usaha'] === 'PT Baru'
                && $data['alamat'] === 'Jl. Baru No. 2'
            )
        )
        ->andReturn(new Profile);

    $this->app->instance(ProfileService::class, $service);

    $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'alamat' => 'Jl. Baru No. 2',
    ])->assertRedirect(route('mitra.profile.edit'));
});

/*
|==========================================================================
| KATEGORI 5 — ERROR HANDLING & VALIDATION
|==========================================================================
| Rules dari UpdateProfileRequest:
|   nama_penyedia_usaha => nullable, max:255
|   nomor_identitas     => nullable, max:255
|   alamat              => nullable, max:1000
|   telepon             => nullable, max:50
|   provinsi            => nullable, max:255
|   kota                => nullable, max:255
|   kode_pos            => nullable, max:20
|   logo                => nullable, image, mimes:jpg,jpeg,png,svg,webp, max:2048
|   deskripsi           => nullable, max:5000
*/

it('update profile dengan nama_penyedia_usaha kosong → disimpan sebagai null', function () {
    // Karena `nama_penyedia_usaha => nullable`
    // + ConvertEmptyStringsToNull → '' dikonversi jadi null
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create([
        'user_id' => $mitra->id,
        'tipe' => 'mitra',
        'nama_penyedia_usaha' => 'PT Lama',
    ]);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => '',
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));

    $profile->refresh();
    expect($profile->nama_penyedia_usaha)->toBeNull();
});

it('gagal update profile jika nama_penyedia_usaha lebih dari 255 karakter', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => str_repeat('a', 256),
    ]);

    $response->assertSessionHasErrors('nama_penyedia_usaha');
});

it('gagal update profile jika alamat lebih dari 1000 karakter', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'alamat' => str_repeat('a', 1001), // ← max:1000 + 1
    ]);

    $response->assertSessionHasErrors('alamat');
});

it('gagal update profile jika telepon lebih dari 50 karakter', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'telepon' => str_repeat('1', 51), // ← max:50 + 1
    ]);

    $response->assertSessionHasErrors('telepon');
});

it('gagal update profile jika kode_pos lebih dari 20 karakter', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'kode_pos' => str_repeat('1', 21), // ← max:20 + 1
    ]);

    $response->assertSessionHasErrors('kode_pos');
});

it('gagal update profile jika deskripsi lebih dari 5000 karakter', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'deskripsi' => str_repeat('a', 5001), // ← max:5000 + 1
    ]);

    $response->assertSessionHasErrors('deskripsi');
});

it('gagal update profile jika logo bukan file gambar', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => $file,
    ]);

    $response->assertSessionHasErrors('logo');
});

it('gagal update profile jika logo lebih dari 2MB', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    // 3 MB
    $file = UploadedFile::fake()->image('logo.png')->size(3000);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => $file,
    ]);

    $response->assertSessionHasErrors('logo');
});

it('gagal update profile jika logo berformat .gif (tidak di whitelist)', function () {
    // Rules mimes: jpg, jpeg, png, svg, webp — GIF tidak termasuk
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $file = UploadedFile::fake()->image('logo.gif', 100, 100);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => $file,
    ]);

    $response->assertSessionHasErrors('logo');
});

/*
|==========================================================================
| KATEGORI 6 — BVA (Boundary Value Analysis)
|==========================================================================
| Menguji batas atas/bawah dari setiap max rules
*/

it('update sukses dengan nama_penyedia_usaha TEPAT 255 karakter (boundary atas)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $longName = str_repeat('a', 255);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => $longName,
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));

    $profile->refresh();
    expect($profile->nama_penyedia_usaha)->toBe($longName);
});

it('gagal update profile dengan nama_penyedia_usaha 256 karakter (boundary atas + 1)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => str_repeat('a', 256),
    ]);

    $response->assertSessionHasErrors('nama_penyedia_usaha');
});

it('update sukses dengan alamat TEPAT 1000 karakter (boundary atas)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $longAlamat = str_repeat('a', 1000);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'alamat' => $longAlamat,
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));

    $profile->refresh();
    expect($profile->alamat)->toBe($longAlamat);
});

it('update sukses dengan telepon TEPAT 50 karakter (boundary atas)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $longTelepon = str_repeat('1', 50);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'telepon' => $longTelepon,
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));

    $profile->refresh();
    expect($profile->telepon)->toBe($longTelepon);
});

it('update sukses dengan deskripsi TEPAT 5000 karakter (boundary atas)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $longDeskripsi = str_repeat('a', 5000);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'deskripsi' => $longDeskripsi,
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));

    $profile->refresh();
    expect($profile->deskripsi)->toBe($longDeskripsi);
});

/*
|==========================================================================
| KATEGORI 7 — EDGE CASES
|==========================================================================
*/

it('update profile dengan data kosong tetap sukses (semua field nullable)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $response = $this->actingAs($mitra)->put('/mitra/profile', []);

    // Semua nullable → tidak error
    $response->assertRedirect(route('mitra.profile.edit'));
    $response->assertSessionDoesntHaveErrors();
});

it('update profile dengan upload logo menghapus logo lama', function () {
    $mitra = User::factory()->mitra()->create([
        'id' => 42,
        'must_change_password' => false,
    ]);

    // Simulasi logo lama ada di storage
    Storage::disk('public')->put('logos/old_logo.png', 'old-content');

    $profile = Profile::factory()->create([
        'user_id' => $mitra->id,
        'tipe' => 'mitra',
        'logo' => 'logos/old_logo.png',
    ]);

    $file = UploadedFile::fake()->image('new.png', 100, 100);

    $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => $file,
    ]);

    // Logo lama harus hilang
    Storage::disk('public')->assertMissing('logos/old_logo.png');
    // Logo baru ada
    Storage::disk('public')->assertExists('logos/42_20261013195300.png');
});

it('gagal update profile dengan SVG logo (SVG tidak diizinkan karena alasan keamanan)', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $file = UploadedFile::fake()->create('logo.svg', 50, 'image/svg+xml');

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => $file,
    ]);

    // SVG ditolak — baik karena rule 'image' maupun karena tidak ada di 'mimes'
    $response->assertSessionHasErrors('logo');
});

it('update profile dengan WEBP logo tetap sukses', function () {
    $mitra = User::factory()->mitra()->create([
        'id' => 51,
        'must_change_password' => false,
    ]);

    Profile::factory()->create(['user_id' => $mitra->id, 'tipe' => 'mitra']);

    $file = UploadedFile::fake()->image('logo.webp', 100, 100);

    $response = $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => $file,
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));
    $response->assertSessionDoesntHaveErrors('logo');
});

/*
|==========================================================================
| KATEGORI 8 — DATA INTEGRITY
|==========================================================================
*/

it('update profile tidak mengubah tipe profile', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $profile = Profile::factory()->create([
        'user_id' => $mitra->id,
        'tipe' => 'mitra',
    ]);

    $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'tipe' => 'admin', // ← coba eskalasi tipe
    ]);

    $profile->refresh();
    expect($profile->tipe)->toBe('mitra');
});

it('update profile tidak mengubah user_id profile', function () {
    $mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    Profile::factory()->create([
        'user_id' => $mitra->id,
        'tipe' => 'mitra',
    ]);

    $originalUserId = $mitra->id;

    $this->actingAs($mitra)->put('/mitra/profile', [
        'nama_penyedia_usaha' => 'PT Baru',
        'user_id' => 999, // ← coba ubah user_id
    ]);

    $profile = $mitra->fresh()->profile;
    expect($profile->user_id)->toBe($originalUserId);
});

/*
|==========================================================================
| KATEGORI 9 — BEHAVIORAL: Route Middleware
|==========================================================================
*/

it('route mitra.profile.edit pakai middleware auth, password.changed, dan role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.profile.edit');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

it('route mitra.profile.update pakai middleware auth, password.changed, dan role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.profile.update');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

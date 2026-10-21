<?php

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    if (method_exists($this, 'withoutVite')) {
        $this->withoutVite();
    }

    Storage::fake('public');

    $this->admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $this->mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);

    // Profile milik mitra yang login
    $this->profile = Profile::factory()->forMitra()->create([
        'user_id' => $this->mitra->id,
        'nama_penyedia_usaha' => 'PT Lama',
        'alamat' => 'Jl. Lama No. 1',
        'telepon' => '0800000000',
        'logo' => null,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /mitra/profile merender Inertia component Mitra/Profile', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.profile.edit'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Mitra/Profile')
        ->has('profile')
    );
});

it('PUT /mitra/profile redirect ke mitra.profile.edit dengan status', function () {
    $response = $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru',
        'alamat' => 'Jl. Baru No. 2',
        'telepon' => '08123456789',
    ]);

    $response->assertRedirect(route('mitra.profile.edit'));
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /mitra/profile', function () {
    $this->get(route('mitra.profile.edit'))->assertRedirect(route('login'));
});

it('guest di-redirect ke login saat update /mitra/profile', function () {
    $this->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru',
    ])->assertRedirect(route('login'));
});

it('admin tidak bisa akses /mitra/profile (redirect ke dashboard admin)', function () {
    $this->actingAs($this->admin)
        ->get(route('mitra.profile.edit'))
        ->assertRedirect(route('admin.dashboard'));
});

it('client tidak bisa akses /mitra/profile (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('mitra.profile.edit'))
        ->assertRedirect(route('client.dashboard'));
});

it('mitra dengan must_change_password = true di-redirect ke change-password', function () {
    $mitra = User::factory()->mitra()->create(['must_change_password' => true]);

    $this->actingAs($mitra)
        ->get(route('mitra.profile.edit'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Edit
|==========================================================================
*/

it('edit menampilkan profile milik mitra yang login', function () {
    $response = $this->actingAs($this->mitra)->get(route('mitra.profile.edit'));

    $response->assertInertia(fn ($page) => $page
        ->where('profile.id', $this->profile->id)
        ->where('profile.nama_penyedia_usaha', 'PT Lama')
        ->where('profile.alamat', 'Jl. Lama No. 1')
        ->where('profile.telepon', '0800000000')
    );
});

it('edit untuk mitra tanpa profile tetap merender halaman dengan profile null', function () {
    $mitraBaru = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);
    // sengaja TIDAK membuat Profile

    $this->actingAs($mitraBaru)
        ->get(route('mitra.profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Mitra/Profile')
            ->where('profile', null)
        );
});

it('edit tidak menampilkan profile milik mitra lain', function () {
    $otherMitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);
    Profile::factory()->forMitra()->create([
        'user_id' => $otherMitra->id,
        'nama_penyedia_usaha' => 'PT Rahasia',
    ]);

    $response = $this->actingAs($this->mitra)->get(route('mitra.profile.edit'));

    $response->assertInertia(fn ($page) => $page
        ->where('profile.id', $this->profile->id)
        ->where('profile.nama_penyedia_usaha', 'PT Lama')
    );
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Update
|==========================================================================
*/

it('update profile menyimpan perubahan ke DB', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Maju Jaya',
        'alamat' => 'Jl. Contoh No. 1',
        'telepon' => '08123456789',
        'provinsi' => 'Jawa Barat',
        'kota' => 'Bandung',
        'kode_pos' => '40123',
        'deskripsi' => 'Deskripsi baru',
    ]);

    $this->assertDatabaseHas('profiles', [
        'user_id' => $this->mitra->id,
        'nama_penyedia_usaha' => 'PT Maju Jaya',
        'alamat' => 'Jl. Contoh No. 1',
        'telepon' => '08123456789',
        'provinsi' => 'Jawa Barat',
        'kota' => 'Bandung',
        'kode_pos' => '40123',
        'deskripsi' => 'Deskripsi baru',
    ]);
});

it('update profile tidak mengubah profile mitra lain', function () {
    $otherMitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);
    $otherProfile = Profile::factory()->forMitra()->create([
        'user_id' => $otherMitra->id,
        'nama_penyedia_usaha' => 'PT Lain',
    ]);

    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Maju Jaya',
    ]);

    $otherProfile->refresh();
    expect($otherProfile->nama_penyedia_usaha)->toBe('PT Lain');
});

it('update profile dengan logo menyimpan file di storage public/logos', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Maju Jaya',
        'logo' => UploadedFile::fake()->image('logo.png', 300, 300),
    ])->assertRedirect();

    $profile = $this->mitra->fresh()->profile;

    expect($profile->logo)->not->toBeNull();
    expect($profile->logo)->toStartWith('logos/');
    Storage::disk('public')->assertExists($profile->logo);
});

it('update profile dengan logo baru menghapus logo lama', function () {
    // Upload logo lama dulu
    $oldPath = UploadedFile::fake()
        ->image('old.png')
        ->storeAs('logos', 'old_logo.png', 'public');

    $this->profile->update(['logo' => $oldPath]);
    Storage::disk('public')->assertExists($oldPath);

    // Upload logo baru
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Maju Jaya',
        'logo' => UploadedFile::fake()->image('new.png'),
    ])->assertRedirect();

    Storage::disk('public')->assertMissing($oldPath);

    $profile = $this->mitra->fresh()->profile;
    Storage::disk('public')->assertExists($profile->logo);
});

it('update tanpa logo tidak menghapus logo lama', function () {
    $oldPath = UploadedFile::fake()
        ->image('old.png')
        ->storeAs('logos', 'old_logo.png', 'public');
    $this->profile->update(['logo' => $oldPath]);

    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru Tanpa Logo',
    ])->assertRedirect();

    $profile = $this->mitra->fresh()->profile;

    expect($profile->logo)->toBe($oldPath);
    Storage::disk('public')->assertExists($oldPath);
});

it('update field yang tidak diizinkan diabaikan (mass assignment protection)', function () {
    $otherUserId = User::factory()->mitra()->create([
        'must_change_password' => false,
    ])->id;

    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Maju Jaya',
        'user_id' => $otherUserId,   // harus diabaikan
        'tipe' => 'admin',           // harus diabaikan
    ]);

    $this->assertDatabaseHas('profiles', [
        'user_id' => $this->mitra->id,   // tidak berubah
        'tipe' => 'mitra',               // tidak berubah
        'nama_penyedia_usaha' => 'PT Maju Jaya',
    ]);
});

/*
|==========================================================================
| KATEGORI 5 — ERROR HANDLING / VALIDATION
|==========================================================================
*/

it('update validasi logo harus image ditolak', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => UploadedFile::fake()->create('dokumen.pdf', 100, 'application/pdf'),
    ])->assertSessionHasErrors('logo');
});

it('update validasi logo mimes harus jpg/png/webp ditolak', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => UploadedFile::fake()->image('logo.gif'),
    ])->assertSessionHasErrors('logo');
});

it('update validasi logo ukuran > 2MB ditolak', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru',
        'logo' => UploadedFile::fake()->image('besar.png')->size(3000), // 3MB
    ])->assertSessionHasErrors('logo');
});

it('update validasi alamat > 1000 karakter ditolak', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru',
        'alamat' => str_repeat('a', 1001),
    ])->assertSessionHasErrors('alamat');
});

it('update validasi deskripsi > 5000 karakter ditolak', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru',
        'deskripsi' => str_repeat('a', 5001),
    ])->assertSessionHasErrors('deskripsi');
});

it('update validasi telepon > 50 karakter ditolak', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'telepon' => str_repeat('1', 51),
    ])->assertSessionHasErrors('telepon');
});

it('update tidak mengubah data saat validasi gagal', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'alamat' => str_repeat('a', 1001), // gagal
    ])->assertSessionHasErrors('alamat');

    $this->assertDatabaseHas('profiles', [
        'user_id' => $this->mitra->id,
        'nama_penyedia_usaha' => 'PT Lama',   // tidak berubah
        'alamat' => 'Jl. Lama No. 1',         // tidak berubah
    ]);
});

/*
|==========================================================================
| KATEGORI 6 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route mitra.profile.edit pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.profile.edit');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

it('route mitra.profile.update pakai middleware auth, password.changed, role:mitra', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'mitra.profile.update');

    expect($route)->not->toBeNull();

    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:mitra');
});

/*
|==========================================================================
| KATEGORI 7 — EDGE CASES
|==========================================================================
*/

it('update profile untuk mitra tanpa profile ditolak dengan error profile', function () {
    $mitraBaru = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);
    // sengaja TIDAK membuat Profile

    $this->actingAs($mitraBaru)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Baru',
    ])->assertSessionHasErrors('profile');
});

it('update tidak mengubah field yang tidak dikirim (partial update)', function () {
    // Profile awal punya alamat "Jl. Lama No. 1"
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => 'PT Maju Jaya',
        // alamat tidak dikirim
    ]);

    $profile = $this->mitra->fresh()->profile;

    expect($profile->nama_penyedia_usaha)->toBe('PT Maju Jaya');
    // Alamat tetap karena tidak dikirim (service pakai array_intersect_key)
    expect($profile->alamat)->toBe('Jl. Lama No. 1');
});

it('update dengan semua field null tetap berhasil (semua nullable)', function () {
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'nama_penyedia_usaha' => null,
        'alamat' => null,
        'telepon' => null,
    ])->assertRedirect();

    $profile = $this->mitra->fresh()->profile;

    expect($profile->nama_penyedia_usaha)->toBeNull();
    expect($profile->alamat)->toBeNull();
    expect($profile->telepon)->toBeNull();
});

it('upload logo dengan nama file mengandung path traversal aman (server rename)', function () {
    // Klien kirim nama aneh, tapi server generate nama sendiri
    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'logo' => UploadedFile::fake()->image('../../evil.png', 100, 100),
    ])->assertRedirect();

    $profile = $this->mitra->fresh()->profile;

    // Path harus di dalam folder logos/ dengan nama {user_id}_{timestamp}.{ext}
    expect($profile->logo)->toStartWith('logos/');
    expect($profile->logo)->not->toContain('..');
    expect($profile->logo)->toContain((string) $this->mitra->id);
    Storage::disk('public')->assertExists($profile->logo);
});

it('update dengan logo SVG ditolak (security: XSS prevention)', function () {
    // SVG bukan image valid di validator, dan juga tidak ada di whitelist
    $svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

    $this->actingAs($this->mitra)->put(route('mitra.profile.update'), [
        'logo' => UploadedFile::fake()->createWithContent('evil.svg', $svgContent),
    ])->assertSessionHasErrors('logo');
});

<?php

use App\Models\Profile;
use App\Models\User;
use App\Services\User\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;

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

    $this->admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $this->otherAdmin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);

    $this->mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /admin/users merender Inertia component Admin/Users/Index', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.users.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Users/Index')
        ->has('users')
        ->has('filters')
    );
});

it('GET /admin/users/create merender Inertia component Admin/Users/Create', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.users.create'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Users/Create')
    );
});

it('GET /admin/users/{id}/edit merender Inertia component Admin/Users/Edit', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.users.edit', $this->mitra->id));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Users/Edit')
        ->has('user')
    );
});

it('store user redirect ke admin.users.index dengan credentials di session', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Admin Baru',
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => 'password123',
        ]);

    $response->assertRedirect(route('admin.users.index'));
    $response->assertSessionHas('credentials');
    $response->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/users', function () {
    $this->get(route('admin.users.index'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/users (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.users.index'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/users (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('admin.users.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->get(route('admin.users.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Create Admin
|==========================================================================
*/

it('store user admin sukses', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Admin Baru',
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => 'password123',
        ]);

    $this->assertDatabaseHas('users', [
        'email' => 'newadmin@example.com',
        'role' => 'admin',
    ]);
});

it('store user admin set must_change_password = true', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Admin Baru',
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => 'password123',
        ]);

    $user = User::where('email', 'newadmin@example.com')->first();
    expect((bool) $user->must_change_password)->toBeTrue();
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: Create Mitra
|==========================================================================
*/

it('store user mitra sukses', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Mitra Baru',
            'email' => 'newmitra@example.com',
            'role' => 'mitra',
            'password' => 'password123',
            'nama_penyedia_usaha' => 'PT Baru',
        ]);

    $this->assertDatabaseHas('users', [
        'email' => 'newmitra@example.com',
        'role' => 'mitra',
    ]);
});

it('store user mitra create profile', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Mitra Baru',
            'email' => 'newmitra@example.com',
            'role' => 'mitra',
            'password' => 'password123',
            'nama_penyedia_usaha' => 'PT Baru',
        ]);

    $user = User::where('email', 'newmitra@example.com')->first();
    $this->assertDatabaseHas('profiles', [
        'user_id' => $user->id,
        'tipe' => 'mitra',
        'nama_penyedia_usaha' => 'PT Baru',
    ]);
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: Update
|==========================================================================
*/

it('update user admin sukses', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.users.update', $this->otherAdmin->id), [
            'name' => 'Admin Updated',
            'email' => $this->otherAdmin->email,
            'role' => 'admin',
        ]);

    $this->otherAdmin->refresh();
    expect($this->otherAdmin->name)->toBe('Admin Updated');
});

it('update user mitra dengan profile data', function () {
    Profile::factory()->create([
        'user_id' => $this->mitra->id,
        'tipe' => 'mitra',
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.users.update', $this->mitra->id), [
            'name' => 'Mitra Updated',
            'email' => $this->mitra->email,
            'role' => 'mitra',
            'profile' => [
                'nama_penyedia_usaha' => 'PT Updated',
            ],
        ]);

    $this->mitra->refresh();
    expect($this->mitra->name)->toBe('Mitra Updated');
    expect($this->mitra->profile->nama_penyedia_usaha)->toBe('PT Updated');
});

/*
|==========================================================================
| KATEGORI 6 — DATA INTEGRITY: Delete
|==========================================================================
*/

it('destroy user mitra sukses', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.users.destroy', $this->mitra->id))
        ->assertRedirect(route('admin.users.index'));

    $this->assertDatabaseMissing('users', [
        'id' => $this->mitra->id,
    ]);
});

it('destroy user sendiri ditolak', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.users.destroy', $this->admin->id))
        ->assertForbidden();
});

it('destroy user client 404', function () {
    $this->actingAs($this->admin)
        ->delete(route('admin.users.destroy', $this->client->id))
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 7 — DATA INTEGRITY: Reset Password
|==========================================================================
*/

it('reset password user sukses', function () {
    $oldPassword = $this->mitra->password;

    $this->actingAs($this->admin)
        ->post(route('admin.users.reset-password', $this->mitra->id))
        ->assertRedirect(route('admin.users.index'))
        ->assertSessionHas('credentials');

    $this->mitra->refresh();
    expect($this->mitra->password)->not->toBe($oldPassword);
    expect((bool) $this->mitra->must_change_password)->toBeTrue();
});

it('reset password user client 404', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.reset-password', $this->client->id))
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 8 — ERROR HANDLING
|==========================================================================
*/

it('store user validasi email duplicate ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Admin Baru',
            'email' => $this->mitra->email, // sudah ada
            'role' => 'admin',
            'password' => 'password123',
        ])
        ->assertSessionHasErrors('email');
});

it('store user validasi role invalid ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Test',
            'email' => 'test@example.com',
            'role' => 'client', // tidak valid untuk create
            'password' => 'password123',
        ])
        ->assertSessionHasErrors('role');
});

it('store user validasi password < 8 ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Admin Baru',
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => 'short',
        ])
        ->assertSessionHasErrors('password');
});

it('store user validasi name required ditolak', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => '',
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => 'password123',
        ])
        ->assertSessionHasErrors('name');
});

it('edit user client 404 (client read-only)', function () {
    $this->actingAs($this->admin)
        ->get(route('admin.users.edit', $this->client->id))
        ->assertNotFound();
});

it('update user client 404', function () {
    $this->actingAs($this->admin)
        ->put(route('admin.users.update', $this->client->id), [
            'name' => 'Client Updated',
            'email' => $this->client->email,
            'role' => 'client',
        ])
        ->assertNotFound();
});

/*
|==========================================================================
| KATEGORI 9 — BEHAVIORAL: Service Dipanggil
|==========================================================================
*/

it('store user admin memanggil UserService::createAdmin', function () {
    $service = Mockery::mock(UserService::class);
    $service->shouldReceive('createAdmin')
        ->once()
        ->andReturn([
            'user' => $this->admin,
            'plain_password' => 'password123',
        ]);

    $this->app->instance(UserService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Admin Baru',
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => 'password123',
        ])
        ->assertRedirect();
});

it('reset password memanggil UserService::resetPassword', function () {
    $service = Mockery::mock(UserService::class);
    $service->shouldReceive('resetPassword')
        ->once()
        ->andReturn([
            'user' => $this->mitra,
            'plain_password' => 'newpass123',
        ]);

    $this->app->instance(UserService::class, $service);

    $this->actingAs($this->admin)
        ->post(route('admin.users.reset-password', $this->mitra->id))
        ->assertRedirect();
});

/*
|==========================================================================
| KATEGORI 10 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.users.index pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.users.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

it('route admin.users.store pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.users.store');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

/*
|==========================================================================
| KATEGORI 11 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('store user sukses dengan password TEPAT 8 karakter (boundary bawah)', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Admin Baru',
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => '12345678', // 8 karakter
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', ['email' => 'newadmin@example.com']);
});

it('store user gagal dengan password 7 karakter', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => 'Admin Baru',
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => '1234567',
        ])
        ->assertSessionHasErrors('password');
});

it('store user sukses dengan name TEPAT 255 karakter', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => str_repeat('a', 255),
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => 'password123',
        ])
        ->assertRedirect();
});

it('store user gagal dengan name 256 karakter', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.store'), [
            'name' => str_repeat('a', 256),
            'email' => 'newadmin@example.com',
            'role' => 'admin',
            'password' => 'password123',
        ])
        ->assertSessionHasErrors('name');
});

/*
|==========================================================================
| KATEGORI 12 — EDGE CASES
|==========================================================================
*/

it('index hanya tampilkan admin + mitra, tidak client', function () {
    // Ada 2 admin + 1 mitra + 1 client
    $response = $this->actingAs($this->admin)->get(route('admin.users.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('users.data', 3) // admin + otherAdmin + mitra (tidak termasuk client)
    );
});

it('index bisa search by name', function () {
    // Search by email (unique) — lebih deterministik dari name random
    $response = $this->actingAs($this->admin)
        ->get(route('admin.users.index', ['search' => $this->mitra->email]));

    $response->assertInertia(fn ($page) => $page
        ->has('users.data', 1)
        ->where('users.data.0.id', $this->mitra->id)
    );
});

it('index bisa search by name exact', function () {
    // Atau set name eksplisit di setup
    $this->mitra->update(['name' => 'Mitra Special']);

    $response = $this->actingAs($this->admin)
        ->get(route('admin.users.index', ['search' => 'Mitra Special']));

    $response->assertInertia(fn ($page) => $page
        ->has('users.data', 1)
        ->where('users.data.0.id', $this->mitra->id)
    );
});

it('reset password user admin sukses', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.users.reset-password', $this->otherAdmin->id))
        ->assertRedirect(route('admin.users.index'))
        ->assertSessionHas('credentials');

    $this->otherAdmin->refresh();
    expect((bool) $this->otherAdmin->must_change_password)->toBeTrue();
});

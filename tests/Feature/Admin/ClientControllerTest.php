<?php

use App\Models\User;
use App\Services\User\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Pagination\LengthAwarePaginator;
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

    $this->mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);

    $this->client = User::factory()->client()->create([
        'name' => 'Client Test',
        'must_change_password' => false,
    ]);

    $this->otherClient = User::factory()->client()->create([
        'name' => 'Client Lain',
        'must_change_password' => false,
    ]);
});

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /admin/clients merender Inertia component Admin/Clients/Index', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.clients.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Clients/Index')
        ->has('clients')
        ->has('filters')
    );
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /admin/clients', function () {
    $this->get(route('admin.clients.index'))->assertRedirect(route('login'));
});

it('mitra tidak bisa akses /admin/clients (redirect ke dashboard mitra)', function () {
    $this->actingAs($this->mitra)
        ->get(route('admin.clients.index'))
        ->assertRedirect(route('mitra.dashboard'));
});

it('client tidak bisa akses /admin/clients (redirect ke dashboard client)', function () {
    $this->actingAs($this->client)
        ->get(route('admin.clients.index'))
        ->assertRedirect(route('client.dashboard'));
});

it('admin dengan must_change_password = true di-redirect ke change-password', function () {
    $admin = User::factory()->admin()->create(['must_change_password' => true]);

    $this->actingAs($admin)
        ->get(route('admin.clients.index'))
        ->assertRedirect(route('password.change'));
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Read-only
|==========================================================================
*/

it('hanya menampilkan role client (tidak admin, tidak mitra)', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.clients.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 2) // 2 client saja
    );
});

it('data client sesuai dengan DB', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.clients.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('clients.data.0.role', 'client')
        ->where('clients.data.1.role', 'client')
    );
});

/*
|==========================================================================
| KATEGORI 4 — BEHAVIORAL: Search
|==========================================================================
*/

it('bisa search client berdasarkan nama', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['search' => 'Client Test']));

    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 1)
        ->where('clients.data.0.id', $this->client->id)
    );
});

it('bisa search client unique via email', function () {
    $this->client->update(['email' => 'unique-client@example.com']);

    $response = $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['search' => 'unique-client@example.com']));

    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 1)
        ->where('clients.data.0.id', $this->client->id)
    );
});

it('search client tidak match admin/mitra', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['search' => $this->admin->email]));

    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 0)
    );
});

it('search client dengan query kosong return semua client', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['search' => '']));

    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 2)
    );
});

/*
|==========================================================================
| KATEGORI 5 — BEHAVIORAL: Pagination
|==========================================================================
*/

it('bisa set per_page custom', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['per_page' => 5]));

    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 2)
        ->where('filters.per_page', 5)
    );
});

it('pakai default per_page = 15', function () {
    $response = $this->actingAs($this->admin)->get(route('admin.clients.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('filters.per_page', 15)
    );
});

/*
|==========================================================================
| KATEGORI 6 — ERROR HANDLING & VALIDATION
|==========================================================================
*/

it('validasi per_page harus integer ditolak', function () {
    $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['per_page' => 'invalid']))
        ->assertSessionHasErrors('per_page');
});

it('validasi per_page minimum 1 ditolak', function () {
    $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['per_page' => 0]))
        ->assertSessionHasErrors('per_page');
});

it('validasi per_page maximum ditolak', function () {
    $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['per_page' => 1000]))
        ->assertSessionHasErrors('per_page');
});

it('validasi search terlalu panjang ditolak', function () {
    $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['search' => str_repeat('a', 300)]))
        ->assertSessionHasErrors('search');
});

/*
|==========================================================================
| KATEGORI 7 — BEHAVIORAL: Service Dipanggil
|==========================================================================
*/

it('memanggil UserService::paginateClients dengan parameter benar', function () {
    $service = Mockery::mock(UserService::class);
    $service->shouldReceive('paginateClients')
        ->once()
        ->with(25, 'Client Test')
        ->andReturn(new LengthAwarePaginator([], 0, 25));

    $this->app->instance(UserService::class, $service);

    $this->actingAs($this->admin)
        ->get(route('admin.clients.index', [
            'search' => 'Client Test',
            'per_page' => 25,
        ]))
        ->assertOk();
});

/*
|==========================================================================
| KATEGORI 8 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route admin.clients.index pakai middleware auth, password.changed, role:admin', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'admin.clients.index');

    expect($route)->not->toBeNull();
    $middleware = $route->gatherMiddleware();

    expect($middleware)->toContain('auth');
    expect($middleware)->toContain('password.changed');
    expect($middleware)->toContain('role:admin');
});

/*
|==========================================================================
| KATEGORI 9 — BVA (Boundary Value Analysis)
|==========================================================================
*/

it('bisa search dengan query TEPAT 255 karakter (boundary atas)', function () {
    $search = str_repeat('a', 255);

    $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['search' => $search]))
        ->assertOk();
});

it('gagal search dengan query 256 karakter (boundary atas + 1)', function () {
    $search = str_repeat('a', 256);

    $this->actingAs($this->admin)
        ->get(route('admin.clients.index', ['search' => $search]))
        ->assertSessionHasErrors('search');
});

/*
|==========================================================================
| KATEGORI 10 — EDGE CASES
|==========================================================================
*/

it('client tanpa username tidak error', function () {
    $this->client->update(['username' => null]);

    $response = $this->actingAs($this->admin)->get(route('admin.clients.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 2)
    );
});

it('client tanpa profile tidak error', function () {
    $this->client->profile()->delete();

    $response = $this->actingAs($this->admin)->get(route('admin.clients.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 2)
    );
});

it('tidak ada client return 0 results', function () {
    // Hapus semua client
    User::where('role', 'client')->delete();

    $response = $this->actingAs($this->admin)->get(route('admin.clients.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('clients.data', 0)
    );
});

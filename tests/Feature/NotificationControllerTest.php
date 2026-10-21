<?php

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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

    $this->mitra = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);
    $this->client = User::factory()->client()->create([
        'must_change_password' => false,
    ]);
    $this->admin = User::factory()->admin()->create([
        'must_change_password' => false,
    ]);
    $this->otherUser = User::factory()->mitra()->create([
        'must_change_password' => false,
    ]);
});

afterEach(function () {
    Carbon::setTestNow(); // jangan bocor ke test lain
});

/**
 * Helper: buat notifikasi untuk user tertentu.
 */
function makeNotif(User $user, array $overrides = []): AppNotification
{
    return AppNotification::create(array_merge([
        'user_id' => $user->id,
        'tipe' => 'info',
        'judul' => 'Judul notifikasi',
        'pesan' => 'Pesan notifikasi',
        'data' => [],
        'read_at' => null,
    ], $overrides));
}

/*
|==========================================================================
| KATEGORI 1 — CONTRACT / API SCHEMA
|==========================================================================
*/

it('GET /notifications merender Inertia component Notifications/Index', function () {
    $this->actingAs($this->mitra)
        ->get(route('notifications.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Notifications/Index')
            ->has('notifications')
            ->has('unreadCount')
        );
});

it('POST /notifications/mark-all-read redirect back dengan status', function () {
    makeNotif($this->mitra);

    $this->actingAs($this->mitra)
        ->from(route('notifications.index'))
        ->post(route('notifications.mark-all-read'))
        ->assertRedirect(route('notifications.index'))
        ->assertSessionHas('status');
});

it('POST /notifications/{id}/read redirect back', function () {
    $notif = makeNotif($this->mitra);

    $this->actingAs($this->mitra)
        ->from(route('notifications.index'))
        ->post(route('notifications.read', $notif))
        ->assertRedirect(route('notifications.index'));
});

/*
|==========================================================================
| KATEGORI 2 — SECURITY & AUTHORIZATION
|==========================================================================
*/

it('guest di-redirect ke login saat akses /notifications', function () {
    $this->get(route('notifications.index'))->assertRedirect(route('login'));
});

it('guest di-redirect ke login saat mark-all-read', function () {
    $this->post(route('notifications.mark-all-read'))->assertRedirect(route('login'));
});

it('guest di-redirect ke login saat mark satu notifikasi read', function () {
    $notif = makeNotif($this->mitra);

    $this->post(route('notifications.read', $notif))->assertRedirect(route('login'));
});

it('mitra tidak bisa menandai notifikasi milik user lain sebagai read (403)', function () {
    $notifUserLain = makeNotif($this->otherUser);

    $this->actingAs($this->mitra)
        ->post(route('notifications.read', $notifUserLain))
        ->assertForbidden();

    expect($notifUserLain->fresh()->read_at)->toBeNull();
});

it('mark-all-read tidak menyentuh notifikasi milik user lain', function () {
    makeNotif($this->mitra);
    $notifLain = makeNotif($this->otherUser);

    $this->actingAs($this->mitra)
        ->from(route('notifications.index'))
        ->post(route('notifications.mark-all-read'));

    expect($notifLain->fresh()->read_at)->toBeNull();
});

it('mitra dengan must_change_password = true tetap bisa akses notifikasi', function () {
    $mitraBaru = User::factory()->mitra()->create(['must_change_password' => true]);

    $this->actingAs($mitraBaru)
        ->get(route('notifications.index'))
        ->assertOk();
});

/*
|==========================================================================
| KATEGORI 3 — DATA INTEGRITY: Index
|==========================================================================
*/

it('index hanya menampilkan notifikasi milik user yang login', function () {
    $notifSaya = makeNotif($this->mitra);
    makeNotif($this->otherUser);

    $this->actingAs($this->mitra)
        ->get(route('notifications.index'))
        ->assertInertia(fn ($page) => $page
            ->has('notifications.data', 1)
            ->where('notifications.data.0.id', $notifSaya->id)
        );
});

it('index menampilkan unreadCount sesuai jumlah notifikasi belum dibaca', function () {
    makeNotif($this->mitra);
    makeNotif($this->mitra);
    makeNotif($this->mitra, ['read_at' => now()]);

    $this->actingAs($this->mitra)
        ->get(route('notifications.index'))
        ->assertInertia(fn ($page) => $page->where('unreadCount', 2));
});

it('index unreadCount = 0 jika semua notifikasi sudah dibaca', function () {
    makeNotif($this->mitra, ['read_at' => now()]);

    $this->actingAs($this->mitra)
        ->get(route('notifications.index'))
        ->assertInertia(fn ($page) => $page->where('unreadCount', 0));
});

it('index unreadCount tidak menghitung notifikasi user lain', function () {
    makeNotif($this->mitra);
    makeNotif($this->otherUser);

    $this->actingAs($this->mitra)
        ->get(route('notifications.index'))
        ->assertInertia(fn ($page) => $page->where('unreadCount', 1));
});

it('index mengurutkan notifikasi terbaru dulu', function () {
    // Kontrol waktu penuh — created_at diisi alami oleh Eloquent
    Carbon::setTestNow(now()->subDays(2));
    $lama = makeNotif($this->mitra, ['judul' => 'Lama']);

    Carbon::setTestNow(now());
    $baru = makeNotif($this->mitra, ['judul' => 'Baru']);

    $this->actingAs($this->mitra)
        ->get(route('notifications.index'))
        ->assertInertia(fn ($page) => $page
            ->where('notifications.data.0.id', $baru->id)
            ->where('notifications.data.1.id', $lama->id)
        );
});

it('index mengurutkan notifikasi dengan created_at sama secara stabil via UUID v7', function () {
    // Simulasi: 2 notifikasi dibuat pada detik yang SAMA
    Carbon::setTestNow(now());

    $notif1 = makeNotif($this->mitra, ['judul' => 'Notif A']);
    $notif2 = makeNotif($this->mitra, ['judul' => 'Notif B']);

    // UUID v7 time-ordered → notif2 (dibuat setelah) harus punya UUID lebih besar
    expect($notif2->id > $notif1->id)->toBeTrue();

    // Ordering: created_at DESC, id DESC → notif2 dulu, lalu notif1
    $this->actingAs($this->mitra)
        ->get(route('notifications.index'))
        ->assertInertia(fn ($page) => $page
            ->where('notifications.data.0.id', $notif2->id)
            ->where('notifications.data.1.id', $notif1->id)
        );
});

/*
|==========================================================================
| KATEGORI 4 — DATA INTEGRITY: markAsRead
|==========================================================================
*/

it('mark satu notifikasi read mengisi read_at', function () {
    $notif = makeNotif($this->mitra);
    expect($notif->read_at)->toBeNull();

    $this->actingAs($this->mitra)
        ->post(route('notifications.read', $notif))
        ->assertRedirect();

    expect($notif->fresh()->read_at)->not->toBeNull();
});

it('mark notifikasi yang sudah dibaca tetap idempotent', function () {
    $firstReadAt = now()->subHour();
    $notif = makeNotif($this->mitra, ['read_at' => $firstReadAt]);

    $this->actingAs($this->mitra)
        ->post(route('notifications.read', $notif))
        ->assertRedirect();

    expect($notif->fresh()->read_at->timestamp)->toBe($firstReadAt->timestamp);
});

/*
|==========================================================================
| KATEGORI 5 — DATA INTEGRITY: markAllAsRead
|==========================================================================
*/

it('mark-all-read mengisi read_at untuk semua notifikasi unread milik user', function () {
    $notif1 = makeNotif($this->mitra);
    $notif2 = makeNotif($this->mitra);
    $sudahBacaAt = now()->subHour();
    $notifSudahBaca = makeNotif($this->mitra, ['read_at' => $sudahBacaAt]);

    $this->actingAs($this->mitra)
        ->post(route('notifications.mark-all-read'))
        ->assertRedirect();

    expect($notif1->fresh()->read_at)->not->toBeNull();
    expect($notif2->fresh()->read_at)->not->toBeNull();
    expect($notifSudahBaca->fresh()->read_at->timestamp)->toBe($sudahBacaAt->timestamp);
});

it('mark-all-read tidak error jika tidak ada notifikasi unread', function () {
    $this->actingAs($this->mitra)
        ->post(route('notifications.mark-all-read'))
        ->assertRedirect()
        ->assertSessionHas('status');
});

/*
|==========================================================================
| KATEGORI 6 — ROUTE MIDDLEWARE
|==========================================================================
*/

it('route notifications.index pakai middleware auth', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'notifications.index');

    expect($route)->not->toBeNull();
    expect($route->gatherMiddleware())->toContain('auth');
});

it('route notifications.mark-all-read pakai middleware auth', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'notifications.mark-all-read');

    expect($route)->not->toBeNull();
    expect($route->gatherMiddleware())->toContain('auth');
});

it('route notifications.read pakai middleware auth', function () {
    $route = collect(Route::getRoutes())
        ->first(fn ($r) => $r->getName() === 'notifications.read');

    expect($route)->not->toBeNull();
    expect($route->gatherMiddleware())->toContain('auth');
});

/*
|==========================================================================
| KATEGORI 7 — EDGE CASES
|==========================================================================
*/

it('notifikasi baru dibuat dengan read_at null (unread)', function () {
    $notif = makeNotif($this->mitra);

    expect($notif->read_at)->toBeNull();
    expect($notif->isRead())->toBeFalse();
});

it('isRead() return true jika read_at terisi', function () {
    $notif = makeNotif($this->mitra, ['read_at' => now()]);

    expect($notif->isRead())->toBeTrue();
});

it('admin bisa mark read notifikasi miliknya sendiri', function () {
    $notif = makeNotif($this->admin);

    $this->actingAs($this->admin)
        ->post(route('notifications.read', $notif))
        ->assertRedirect();

    expect($notif->fresh()->read_at)->not->toBeNull();
});

it('client bisa mark read notifikasi miliknya sendiri', function () {
    $notif = makeNotif($this->client);

    $this->actingAs($this->client)
        ->post(route('notifications.read', $notif))
        ->assertRedirect();

    expect($notif->fresh()->read_at)->not->toBeNull();
});

it('notifikasi menggunakan UUID v7 yang valid', function () {
    $notif = makeNotif($this->mitra);

    expect($notif->id)->toMatch(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i'
    );
});

it('mark read dengan UUID yang tidak ada mengembalikan 404', function () {
    $fakeUuid = '00000000-0000-7000-8000-000000000000';

    $this->actingAs($this->mitra)
        ->post("/notifications/{$fakeUuid}/read")
        ->assertNotFound();
});

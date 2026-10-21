<?php

declare(strict_types=1);

use App\Enums\TripStatus;
use App\Models\Booking;
use App\Models\DailyReport;
use App\Models\Package;
use App\Models\Trip;
use App\Models\TripDay;
use App\Models\User;
use App\Repositories\Contracts\WalletRepositoryInterface;
use App\Services\Booking\BookingService;
use App\Services\Trip\DailyReportService;
use App\Services\Trip\DispatchService;
use App\Services\Wallet\PayoutService;
use App\Services\Wallet\WalletService;
use App\Support\Timezone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Test-Only Routes
|--------------------------------------------------------------------------
|
| File ini HANYA di-load saat APP_ENV=testing (lihat bootstrap/app.php).
| JANGAN pernah di-load di production.
|
| Route di sini untuk keperluan E2E test:
| - Reset rate limiter
| - Reset state user (password, name, username, timezone)
| - Reset state profile (nama_penyedia_usaha, kota, alamat, dll)
| - Reset database (migrate:fresh + seed)
|
| Semua route di-prefix dengan `/_test/` supaya jelas test-only.
|
*/

// ==========================================
// SAFETY GUARD & HELPERS
// ==========================================

$ensureTesting = static function (): void {
    abort_unless(config('app.env') === 'testing', 404);
};

/**
 * Helper per-model dengan return type eksplisit — PHPStan-friendly.
 *
 * Menggantikan `Model::findOrFail()` yang di Larastan dikembalikan
 * sebagai `Model|Collection`. Dengan `find()` + `abort()` (return `never`),
 * tipe return pasti model tunggal.
 */
$findPackage = static fn (int $id): Package => Package::query()->find($id) ?? abort(404, 'Package tidak ditemukan.');
$findBooking = static fn (int $id): Booking => Booking::query()->find($id) ?? abort(404, 'Booking tidak ditemukan.');
$findTrip = static fn (int $id): Trip => Trip::query()->find($id) ?? abort(404, 'Trip tidak ditemukan.');
$findReport = static fn (int $id): DailyReport => DailyReport::query()->find($id) ?? abort(404, 'DailyReport tidak ditemukan.');
$findUser = static fn (int $id): User => User::query()->find($id) ?? abort(404, 'User tidak ditemukan.');

/**
 * Ambil nilai scalar dari property yang mungkin enum atau string.
 */
$enumValue = static fn (mixed $value): mixed => $value instanceof BackedEnum ? $value->value : $value;

/**
 * Bangun participants array untuk booking test.
 *
 * @return array<int, array{nama: string, umur: int, no_hp: string, catatan: string|null}>
 */
$buildParticipants = static function (int $jumlahPeserta): array {
    $participants = [];

    for ($i = 0; $i < $jumlahPeserta; $i++) {
        $participants[] = [
            'nama' => 'Peserta Test '.($i + 1),
            'umur' => 30,
            'no_hp' => '0812345678'.str_pad((string) $i, 2, '0', STR_PAD_LEFT),
            'catatan' => null,
        ];
    }

    return $participants;
};

// ==========================================
// RESET RATE LIMITER
// ==========================================
Route::post('/_test/clear-throttle', function (Request $request) use ($ensureTesting): Response {
    $ensureTesting();

    $limiter = $request->input('limiter');
    $key = $request->input('key');

    if (! is_string($limiter) || ! is_string($key)) {
        abort(400, 'Missing limiter or key');
    }

    RateLimiter::clear($key);

    if ($limiter === 'contact') {
        RateLimiter::clear((string) $request->ip());
    }

    return response()->noContent();
})->name('test.clear-throttle');

// ==========================================
// RESET USER
// ==========================================
Route::post('/_test/reset-user', function (Request $request) use ($ensureTesting): Response {
    $ensureTesting();

    $request->validate([
        'email' => ['required', 'email'],
    ]);

    /** @var User|null $user */
    $user = User::query()->where('email', $request->input('email'))->first();

    if ($user === null) {
        abort(404, 'User not found');
    }

    $userUpdate = [
        'password' => $request->input('password', 'password123'),
        'must_change_password' => $request->boolean('must_change_password', false),
        'name' => $request->input('name', $user->name),
        'username' => $request->input('username', $user->username),
    ];

    if ($request->has('timezone')) {
        $tz = $request->input('timezone');

        if (is_string($tz) && Timezone::isValid($tz)) {
            $userUpdate['timezone'] = $tz;
        }
    }

    $user->update($userUpdate);

    if ($user->profile !== null) {
        $profileFields = [
            'nama_penyedia_usaha',
            'nomor_identitas',
            'alamat',
            'telepon',
            'provinsi',
            'kota',
            'kode_pos',
            'deskripsi',
        ];

        $profileUpdate = [];
        foreach ($profileFields as $field) {
            if ($request->has($field)) {
                $profileUpdate[$field] = $request->input($field);
            }
        }

        if ($profileUpdate !== []) {
            $user->profile->update($profileUpdate);
        }
    }

    return response()->noContent();
})->name('test.reset-user');

// ==========================================
// DELETE USER
// ==========================================
Route::delete('/_test/user', function (Request $request) use ($ensureTesting): Response {
    $ensureTesting();

    $request->validate([
        'email' => ['required', 'email'],
    ]);

    User::query()->where('email', $request->input('email'))->delete();

    return response()->noContent();
})->name('test.delete-user');

// ==========================================
// SIMULATE EXPIRED BOOKINGS
// ==========================================
Route::post('/_test/simulate-expired-bookings', function (Request $request) use ($ensureTesting): JsonResponse {
    $ensureTesting();

    $request->validate([
        'count' => ['nullable', 'integer', 'min:1', 'max:100'],
        'booking_id' => ['nullable', 'integer'],
    ]);

    $query = Booking::query()->pendingPayment();

    if ($request->has('booking_id')) {
        $query->where('id', $request->input('booking_id'));
    }

    $bookings = $query
        ->orderByDesc('id')
        ->limit((int) $request->input('count', 1))
        ->get();

    foreach ($bookings as $booking) {
        $booking->update(['expired_at' => now()->subHours(2)]);
    }

    return response()->json([
        'count' => $bookings->count(),
        'bookings' => $bookings->pluck('kode'),
    ]);
})->name('test.simulate-expired-bookings');

// ==========================================
// RUN EXPIRE COMMAND
// ==========================================
Route::post('/_test/run-expire-bookings', function () use ($ensureTesting): Response {
    $ensureTesting();

    Artisan::call('bookings:expire');

    return response()->noContent();
})->name('test.run-expire-bookings');

// ==========================================
// CREATE BOOKING (E2E HELPER)
// ==========================================
Route::post('/_test/create-booking', function (Request $request) use ($ensureTesting, $findPackage, $enumValue, $buildParticipants): JsonResponse {
    $ensureTesting();

    $request->validate([
        'package_id' => ['required', 'integer', 'exists:packages,id'],
        'client_index' => ['nullable', 'integer', 'min:0'],
        'days_ahead' => ['nullable', 'integer', 'min:3', 'max:365'],
        'jumlah_peserta' => ['nullable', 'integer', 'min:1', 'max:100'],
    ]);

    $package = $findPackage((int) $request->input('package_id'));

    $clientIndex = (int) $request->input('client_index', 0);
    /** @var User|null $client */
    $client = User::query()
        ->where('role', 'client')
        ->orderBy('id')
        ->skip($clientIndex)
        ->first();

    if ($client === null) {
        abort(404, 'Client not found');
    }

    $daysAhead = (int) $request->input('days_ahead', 7);
    $jumlahPeserta = (int) $request->input('jumlah_peserta', 2);

    try {
        $booking = app(BookingService::class)->create(
            package: $package,
            client: $client,
            data: [
                'tanggal_keberangkatan' => now()->addDays($daysAhead)->format('Y-m-d'),
                'jumlah_peserta' => $jumlahPeserta,
                'catatan' => 'E2E test booking',
                'participants' => $buildParticipants($jumlahPeserta),
            ],
        );

        return response()->json([
            'id' => $booking->id,
            'kode' => $booking->kode,
            'status' => $enumValue($booking->status),
        ]);
    } catch (Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 422);
    }
})->name('test.create-booking');

// ==========================================
// VERIFY BOOKING PAYMENT (E2E HELPER)
// ==========================================
Route::post('/_test/verify-booking-payment', function (Request $request) use ($ensureTesting, $findBooking): Response|JsonResponse {
    $ensureTesting();

    $request->validate([
        'booking_id' => ['required', 'integer', 'exists:bookings,id'],
    ]);

    $booking = $findBooking((int) $request->input('booking_id'));

    /** @var User $admin */
    $admin = User::query()->where('role', 'admin')->firstOrFail();

    try {
        app(BookingService::class)->verifyPayment($booking, $admin);

        return response()->noContent();
    } catch (Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 422);
    }
})->name('test.verify-booking-payment');

// ==========================================
// CREATE TRIP (E2E HELPER)
// ==========================================
Route::post('/_test/create-trip', function (Request $request) use ($ensureTesting, $findPackage, $findTrip, $enumValue, $buildParticipants): JsonResponse {
    $ensureTesting();

    $request->validate([
        'package_id' => ['required', 'integer', 'exists:packages,id'],
        'client_index' => ['nullable', 'integer', 'min:0'],
        'mitra_index' => ['nullable', 'integer', 'min:0'],
        'days_ahead' => ['nullable', 'integer', 'min:3', 'max:365'],
        'jumlah_peserta' => ['nullable', 'integer', 'min:1', 'max:100'],
        'skip_mitra' => ['nullable', 'boolean'],
    ]);

    $package = $findPackage((int) $request->input('package_id'));

    $clientIndex = (int) $request->input('client_index', 0);
    /** @var User|null $client */
    $client = User::query()
        ->where('role', 'client')
        ->orderBy('id')
        ->skip($clientIndex)
        ->first();

    if ($client === null) {
        abort(404, 'Client not found');
    }

    $daysAhead = (int) $request->input('days_ahead', 7);
    $jumlahPeserta = (int) $request->input('jumlah_peserta', 2);

    try {
        $booking = app(BookingService::class)->create(
            package: $package,
            client: $client,
            data: [
                'tanggal_keberangkatan' => now()->addDays($daysAhead)->format('Y-m-d'),
                'jumlah_peserta' => $jumlahPeserta,
                'catatan' => 'E2E test trip',
                'participants' => $buildParticipants($jumlahPeserta),
            ],
        );

        /** @var User $admin */
        $admin = User::query()->where('role', 'admin')->firstOrFail();

        app(BookingService::class)->verifyPayment($booking, $admin);
        app(BookingService::class)->confirm($booking, $admin);

        $trip = $findTrip(
            (int) Trip::query()->where('booking_id', $booking->id)->value('id'),
        );

        if (! $request->boolean('skip_mitra', false)) {
            $mitraIndex = (int) $request->input('mitra_index', 0);
            /** @var User|null $mitra */
            $mitra = User::query()
                ->where('role', 'mitra')
                ->orderBy('id')
                ->skip($mitraIndex)
                ->first();

            if ($mitra !== null) {
                app(DispatchService::class)->assignMitra(
                    trip: $trip,
                    data: [
                        'mitra_id' => $mitra->id,
                        'role' => 'lead',
                        'honor' => 500000,
                        'honor_tipe' => 'flat',
                        'instruksi' => 'E2E test instruksi',
                    ],
                    admin: $admin,
                );
            }
        }

        return response()->json([
            'trip_id' => $trip->id,
            'trip_kode' => $trip->kode,
            'booking_id' => $booking->id,
            'booking_kode' => $booking->kode,
            'status' => $enumValue($trip->status),
            'has_mitra' => $trip->fresh()->hasMitra(),
        ]);
    } catch (Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 422);
    }
})->name('test.create-trip');

// ==========================================
// SIMULATE TRIP DUE
// ==========================================
/**
 * Paksa trip jadi "due" (tanggal_mulai = hari ini - days_ago).
 *
 * ✅ FIX: pakai `Timezone::today($trip->timezoneOrDefault())` — BUKAN `now()`.
 *
 * Kenapa:
 * - `now()` = UTC (dari config/app.php 'timezone' => 'UTC')
 * - `DashboardController` hitung `hari_ke` pakai `Timezone::today($tz)` (WITA)
 * - Jika test jalan jam 16:00–23:59 UTC, `now()` = hari ini UTC,
 *   tapi `Timezone::today('Asia/Makassar')` = besok WITA → beda 1 hari
 * - Akibatnya `trips.tanggal_mulai` ≠ `todayStr` WITA → `hari_ke` salah
 * - `TripDay.tanggal` juga harus di-update agar sinkron
 */
Route::post('/_test/simulate-trip-due', function (Request $request) use ($ensureTesting, $findTrip, $enumValue): JsonResponse {
    $ensureTesting();

    $request->validate([
        'trip_id' => ['required', 'integer', 'exists:trips,id'],
        'days_ago' => ['nullable', 'integer', 'min:0', 'max:30'],
    ]);

    $trip = $findTrip((int) $request->input('trip_id'));
    $daysAgo = (int) $request->input('days_ago', 1);

    // ✅ FIX: pakai timezone trip, BUKAN now() (UTC)
    $tz = $trip->timezoneOrDefault();
    $todayLocal = Timezone::today($tz);

    $tanggalMulaiBaru = $todayLocal->copy()->subDays($daysAgo)->format('Y-m-d');
    $tanggalSelesaiBaru = $todayLocal->copy()->addDays(1)->format('Y-m-d');

    $trip->update([
        'tanggal_mulai' => $tanggalMulaiBaru,
        'tanggal_selesai' => $tanggalSelesaiBaru,
        'status' => TripStatus::SCHEDULED->value,
    ]);

    // ✅ FIX: update TripDay.tanggal agar sinkron dengan tanggal_mulai baru
    // Tanpa ini: TripDay.tanggal dari seed masih tanggal lama → dashboard
    // tidak menemukan TripDay untuk hari ini → report-warning tidak muncul
    $tanggalMulaiCarbon = Carbon::parse($tanggalMulaiBaru);

    foreach ($trip->days as $day) {
        $day->update([
            'tanggal' => $tanggalMulaiCarbon
                ->copy()
                ->addDays($day->hari_ke - 1)
                ->format('Y-m-d'),
        ]);
    }

    $fresh = $trip->fresh();

    return response()->json([
        'trip_id' => $trip->id,
        'tanggal_mulai' => $fresh?->tanggal_mulai,
        'status' => $enumValue($fresh?->status),
    ]);
})->name('test.simulate-trip-due');

// ==========================================
// RUN ACTIVATE TRIPS
// ==========================================
Route::post('/_test/run-activate-trips', function () use ($ensureTesting): Response {
    $ensureTesting();

    Artisan::call('trips:activate');

    return response()->noContent();
})->name('test.run-activate-trips');

// ==========================================
// RESET TRIP
// ==========================================
Route::post('/_test/reset-trip', function (Request $request) use ($ensureTesting, $findTrip): Response {
    $ensureTesting();

    $request->validate([
        'trip_id' => ['required', 'integer', 'exists:trips,id'],
        'status' => ['nullable', 'string', 'in:scheduled,active,completed,cancelled'],
    ]);

    $trip = $findTrip((int) $request->input('trip_id'));

    $trip->update([
        'status' => $request->input('status', TripStatus::SCHEDULED->value),
    ]);

    return response()->noContent();
})->name('test.reset-trip');

// ==========================================
// SUBMIT DAILY REPORT (E2E HELPER)
// ==========================================
Route::post('/_test/submit-daily-report', function (Request $request) use ($ensureTesting, $findTrip, $enumValue): JsonResponse {
    $ensureTesting();

    $request->validate([
        'trip_id' => ['required', 'integer', 'exists:trips,id'],
        'hari_ke' => ['required', 'integer', 'min:1'],
        'mitra_id' => ['nullable', 'integer', 'exists:users,id'],
        'mitra_index' => ['nullable', 'integer', 'min:0'],
        'catatan' => ['nullable', 'string', 'max:2000'],
        'tanpa_media' => ['nullable', 'boolean'],
    ]);

    $trip = $findTrip((int) $request->input('trip_id'));

    $tripDay = TripDay::query()
        ->where('trip_id', $trip->id)
        ->where('hari_ke', $request->input('hari_ke'))
        ->first();

    if ($tripDay === null) {
        abort(404, 'Trip day tidak ditemukan');
    }

    if ($request->has('mitra_id')) {
        $mitra = User::query()->find($request->input('mitra_id'));
    } else {
        $mitraIndex = (int) $request->input('mitra_index', 0);
        $mitra = $trip->mitras()
            ->with('mitra')
            ->orderBy('id')
            ->skip($mitraIndex)
            ->first()
            ?->mitra;
    }

    if ($mitra === null) {
        abort(404, 'Mitra tidak di-assign ke trip ini');
    }

    /** @var array<int, UploadedFile> $mediaFiles */
    $mediaFiles = [];
    if (! $request->boolean('tanpa_media', false)) {
        $dummyImage = UploadedFile::fake()->image('bukti.jpg', 800, 600);
        $mediaFiles = [$dummyImage];
    }

    try {
        $report = app(DailyReportService::class)->submit(
            trip: $trip,
            tripDay: $tripDay,
            mitra: $mitra,
            data: [
                'catatan' => $request->input('catatan'),
                'media' => $mediaFiles,
            ],
        );

        return response()->json([
            'report_id' => $report->id,
            'status' => $enumValue($report->status),
            'trip_id' => $trip->id,
            'trip_day_id' => $tripDay->id,
            'hari_ke' => $tripDay->hari_ke,
            'mitra_id' => $mitra->id,
            'media_count' => $report->media()->count(),
        ]);
    } catch (Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 422);
    }
})->name('test.submit-daily-report');

// ==========================================
// VERIFY DAILY REPORT (E2E HELPER)
// ==========================================
Route::post('/_test/verify-daily-report', function (Request $request) use ($ensureTesting, $findReport, $enumValue): JsonResponse {
    $ensureTesting();

    $request->validate([
        'report_id' => ['required', 'integer', 'exists:daily_reports,id'],
    ]);

    $report = $findReport((int) $request->input('report_id'));

    /** @var User $admin */
    $admin = User::query()->where('role', 'admin')->firstOrFail();

    try {
        app(DailyReportService::class)->verify($report, $admin);

        return response()->json([
            'report_id' => $report->id,
            'status' => $enumValue($report->fresh()?->status),
        ]);
    } catch (Throwable $e) {
        return response()->json(['error' => $e->getMessage()], 422);
    }
})->name('test.verify-daily-report');

// ==========================================
// VERIFY ALL DAILY REPORTS FOR TRIP (E2E HELPER)
// ==========================================
Route::post('/_test/verify-all-daily-reports', function (Request $request) use ($ensureTesting, $findTrip, $enumValue): JsonResponse {
    $ensureTesting();

    $request->validate([
        'trip_id' => ['required', 'integer', 'exists:trips,id'],
    ]);

    $trip = $findTrip((int) $request->input('trip_id'));

    /** @var User $admin */
    $admin = User::query()->where('role', 'admin')->firstOrFail();

    $reports = DailyReport::query()
        ->whereHas('tripDay', static fn ($q) => $q->where('trip_id', $trip->id))
        ->where('status', DailyReport::STATUS_SUBMITTED)
        ->get();

    $verified = 0;
    foreach ($reports as $report) {
        try {
            app(DailyReportService::class)->verify($report, $admin);
            $verified++;
        } catch (Throwable) {
            // skip
        }
    }

    return response()->json([
        'trip_id' => $trip->id,
        'verified_count' => $verified,
        'trip_status' => $enumValue($trip->fresh()?->status),
    ]);
})->name('test.verify-all-daily-reports');

// ==========================================
// SIMULATE TRIP SELESAI (E2E HELPER)
// ==========================================
Route::post('/_test/simulate-trip-finished', function (Request $request) use ($ensureTesting, $findTrip): JsonResponse {
    $ensureTesting();

    $request->validate([
        'trip_id' => ['required', 'integer', 'exists:trips,id'],
        'days_ago' => ['nullable', 'integer', 'min:0', 'max:30'],
    ]);

    $trip = $findTrip((int) $request->input('trip_id'));
    $daysAgo = (int) $request->input('days_ago', 1);

    $trip->update([
        'tanggal_selesai' => now()->subDays($daysAgo)->format('Y-m-d'),
    ]);

    return response()->json([
        'trip_id' => $trip->id,
        'tanggal_selesai' => $trip->fresh()?->tanggal_selesai,
    ]);
})->name('test.simulate-trip-finished');

// ==========================================
// WALLET & PAYOUT HELPERS
// ==========================================

Route::post('/_test/add-wallet-balance', function (Request $request) use ($ensureTesting, $findUser): JsonResponse {
    $ensureTesting();

    $request->validate([
        'mitra_id' => ['required', 'integer', 'exists:users,id'],
        'jumlah' => ['required', 'numeric', 'min:1'],
    ]);

    $mitra = $findUser((int) $request->input('mitra_id'));

    $walletService = app(WalletService::class);
    $wallet = $walletService->findByMitra($mitra);

    $repo = app(WalletRepositoryInterface::class);
    $jumlah = (float) $request->input('jumlah');
    $newSaldo = (float) $wallet->saldo + $jumlah;

    $repo->update($wallet, [
        'saldo' => $newSaldo,
        'total_pendapatan' => (float) $wallet->total_pendapatan + $jumlah,
    ]);

    $repo->createTransaction([
        'wallet_id' => $wallet->id,
        'tipe' => 'credit',
        'jumlah' => $jumlah,
        'saldo_setelah' => $newSaldo,
        'kategori' => 'adjustment',
        'deskripsi' => 'Test credit',
    ]);

    return response()->json(['saldo' => $newSaldo]);
})->name('test.add-wallet-balance');

Route::post('/_test/create-payout', function (Request $request) use ($ensureTesting, $findUser, $enumValue): JsonResponse {
    $ensureTesting();

    $request->validate([
        'mitra_id' => ['required', 'integer', 'exists:users,id'],
        'jumlah' => ['required', 'numeric', 'min:100000'],
    ]);

    $mitra = $findUser((int) $request->input('mitra_id'));

    $payout = app(PayoutService::class)->request($mitra, [
        'jumlah' => $request->input('jumlah'),
        'bank_tujuan' => 'BCA',
        'no_rekening' => '1234567890',
        'nama_pemilik' => $mitra->name,
    ]);

    return response()->json([
        'payout_id' => $payout->id,
        'kode' => $payout->kode,
        'status' => $enumValue($payout->status),
    ]);
})->name('test.create-payout');

// ==========================================
// FIND PACKAGE (E2E HELPER)
// ==========================================
Route::post('/_test/find-package', function (Request $request) use ($ensureTesting): JsonResponse {
    $ensureTesting();

    $request->validate([
        'kode' => ['required', 'string'],
    ]);

    /** @var Package|null $pkg */
    $pkg = Package::query()
        ->where('kode', $request->input('kode'))
        ->first();

    if ($pkg === null) {
        abort(404, 'Package tidak ditemukan untuk kode: '.$request->input('kode'));
    }

    return response()->json([
        'id' => $pkg->id,
        'kode' => $pkg->kode,
        'nama' => $pkg->nama,
        'status' => $pkg->status instanceof BackedEnum ? $pkg->status->value : $pkg->status,
        'timezone' => $pkg->timezone,
        'durasi_hari' => $pkg->durasi_hari,
    ]);
})->name('test.find-package');

// ==========================================
// FIND TRIP (E2E HELPER)
// ==========================================
/**
 * Resolve ID trip dari kode (mis. `TRP-2026-001`).
 *
 * Dipakai oleh `e2e/auth.ts` → `getTripIdByKode()` untuk
 * kebutuhan `resetTripState()` (reset status trip ke `scheduled`).
 *
 * Return: id, kode, status, tanggal_mulai, mitra_count.
 */
Route::post('/_test/find-trip', function (Request $request) use ($ensureTesting): JsonResponse {
    $ensureTesting();

    $request->validate([
        'kode' => ['required', 'string'],
    ]);

    /** @var Trip|null $trip */
    $trip = Trip::query()
        ->where('kode', $request->input('kode'))
        ->first();

    if ($trip === null) {
        abort(404, 'Trip tidak ditemukan untuk kode: '.$request->input('kode'));
    }

    return response()->json([
        'id' => $trip->id,
        'kode' => $trip->kode,
        'status' => $trip->status instanceof BackedEnum ? $trip->status->value : $trip->status,
        'tanggal_mulai' => $trip->tanggal_mulai,
        'mitra_count' => $trip->mitras()->count(),
    ]);
})->name('test.find-trip');

// ==========================================
// RESET TRIP DAYS (E2E HELPER)
// ==========================================
Route::post('/_test/reset-trip-days', function (Request $request) use ($ensureTesting, $findTrip): Response {
    $ensureTesting();

    $request->validate([
        'trip_id' => ['required', 'integer', 'exists:trips,id'],
    ]);

    $trip = $findTrip((int) $request->input('trip_id'));

    // ✅ Hapus semua TripDay — cascade ke daily_reports (FK sudah cascadeOnDelete)
    TripDay::query()
        ->where('trip_id', $trip->id)
        ->delete();

    // ✅ Durasi: fallback berlapis
    $durasiHari = $trip->package?->durasi_hari
        ?? $trip->snapshotDurasiHari()
        ?? 1;

    // ✅ Tanggal mulai: fallback ke now()
    $tanggalMulai = $trip->tanggal_mulai
        ? Carbon::parse($trip->tanggal_mulai)
        : now();

    // ✅ Re-create TripDay — LENGKAP dengan judul (WAJIB)
    for ($i = 1; $i <= $durasiHari; $i++) {
        TripDay::create([
            'trip_id' => $trip->id,
            'hari_ke' => $i,
            'tanggal' => $tanggalMulai->copy()->addDays($i - 1)->format('Y-m-d'),
            'judul' => 'Hari ke-'.$i,  // ✅ WAJIB — anti not-null violation
            'deskripsi' => null,
            'status' => TripDay::STATUS_PENDING,
        ]);
    }

    return response()->noContent();
})->name('test.reset-trip-days');

// ==========================================
// RESET TRIP MITRAS (E2E HELPER)
// ==========================================
Route::post('/_test/reset-trip-mitras', function (Request $request) use ($ensureTesting, $findTrip): Response {
    $ensureTesting();

    $request->validate([
        'trip_id' => ['required', 'integer', 'exists:trips,id'],
    ]);

    $trip = $findTrip((int) $request->input('trip_id'));

    // Hapus semua mitra di trip
    $trip->mitras()->delete();

    // Re-assign 2 mitra seed (Budi + Ani)
    $mitra1 = User::where('email', 'budi@ptabc.com')->first();
    $mitra2 = User::where('email', 'ani@gmail.com')->first();
    $admin = User::where('role', 'admin')->first();

    if ($mitra1 && $admin) {
        $trip->mitras()->create([
            'mitra_id' => $mitra1->id,
            'role' => 'lead',
            'honor' => 1_000_000,
            'honor_tipe' => 'flat',
            'instruksi' => 'E2E reset',
            'assigned_by' => $admin->id,
            'assigned_at' => now(),
        ]);
    }

    if ($mitra2 && $admin) {
        $trip->mitras()->create([
            'mitra_id' => $mitra2->id,
            'role' => 'asisten',
            'honor' => 500_000,
            'honor_tipe' => 'flat',
            'instruksi' => 'E2E reset',
            'assigned_by' => $admin->id,
            'assigned_at' => now(),
        ]);
    }

    return response()->noContent();
})->name('test.reset-trip-mitras');

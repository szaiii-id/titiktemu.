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
*/

$ensureTesting = static function (): void {
    abort_unless(config('app.env') === 'testing', 404);
};

$findPackage = static fn (int $id): Package => Package::query()->find($id) ?? abort(404, 'Package tidak ditemukan.');
$findBooking = static fn (int $id): Booking => Booking::query()->find($id) ?? abort(404, 'Booking tidak ditemukan.');
$findTrip = static fn (int $id): Trip => Trip::query()->find($id) ?? abort(404, 'Trip tidak ditemukan.');
$findReport = static fn (int $id): DailyReport => DailyReport::query()->find($id) ?? abort(404, 'DailyReport tidak ditemukan.');
$findUser = static fn (int $id): User => User::query()->find($id) ?? abort(404, 'User tidak ditemukan.');

$enumValue = static fn (mixed $value): mixed => $value instanceof BackedEnum ? $value->value : $value;

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
Route::post('/_test/simulate-trip-due', function (Request $request) use ($ensureTesting, $findTrip, $enumValue): JsonResponse {
    $ensureTesting();

    $request->validate([
        'trip_id' => ['required', 'integer', 'exists:trips,id'],
        'days_ago' => ['nullable', 'integer', 'min:0', 'max:30'],
    ]);

    $trip = $findTrip((int) $request->input('trip_id'));
    $daysAgo = (int) $request->input('days_ago', 1);

    $tz = $trip->timezoneOrDefault();
    $todayLocal = Timezone::today($tz);

    $tanggalMulaiBaru = $todayLocal->copy()->subDays($daysAgo)->format('Y-m-d');
    $tanggalSelesaiBaru = $todayLocal->copy()->addDays(1)->format('Y-m-d');

    $trip->update([
        'tanggal_mulai' => $tanggalMulaiBaru,
        'tanggal_selesai' => $tanggalSelesaiBaru,
        'status' => TripStatus::SCHEDULED->value,
    ]);

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
        /** @var User|null $mitra */
        $mitra = User::query()->find($request->input('mitra_id'));
    } else {
        // ✅ FIX PHPStan: query langsung dari User agar return type pasti User
        $mitraIndex = (int) $request->input('mitra_index', 0);
        /** @var User|null $mitra */
        $mitra = User::query()
            ->whereHas('tripMitras', static fn ($q) => $q->where('trip_id', $trip->id))
            ->orderBy('id')
            ->skip($mitraIndex)
            ->first();
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
        'status' => $pkg->status->value, // ✅ FIX: status pasti enum
        'timezone' => $pkg->timezone,
        'durasi_hari' => $pkg->durasi_hari,
    ]);
})->name('test.find-package');

// ==========================================
// FIND TRIP (E2E HELPER)
// ==========================================
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
        'status' => $trip->status->value, // ✅ FIX: status pasti enum
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

    TripDay::query()
        ->where('trip_id', $trip->id)
        ->delete();

    // ✅ FIX PHPStan: relasi package tidak nullable, tidak perlu ?->
    $durasiHari = $trip->package->durasi_hari;

    // ✅ FIX PHPStan: tanggal_mulai bisa nullable, jadi tetap pakai ?? fallback
    // ✅ FIX PHPStan: tanggal_mulai sudah pasti Carbon (tidak nullable)
    $tanggalMulai = Carbon::parse($trip->tanggal_mulai);

    for ($i = 1; $i <= $durasiHari; $i++) {
        TripDay::create([
            'trip_id' => $trip->id,
            'hari_ke' => $i,
            'tanggal' => $tanggalMulai->copy()->addDays($i - 1)->format('Y-m-d'),
            'judul' => 'Hari ke-'.$i,
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

    $trip->mitras()->delete();

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

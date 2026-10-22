<?php

use App\Models\User;
use App\Support\Timezone;
use Carbon\Carbon;
use Carbon\CarbonImmutable;

/*
|==========================================================================
| SETUP
|==========================================================================
*/

beforeEach(function () {
    // Freeze time agar deterministik
    CarbonImmutable::setTestNow(CarbonImmutable::create(2026, 1, 15, 10, 30, 0, 'UTC'));
});

afterEach(function () {
    CarbonImmutable::setTestNow(); // reset
});

/*
|==========================================================================
| isValid() — HAPPY & NEGATIVE PATH
|==========================================================================
*/

it('isValid return true untuk timezone IANA valid', function () {
    expect(Timezone::isValid('Asia/Jakarta'))->toBeTrue();
    expect(Timezone::isValid('Asia/Makassar'))->toBeTrue();
    expect(Timezone::isValid('Asia/Jayapura'))->toBeTrue();
    expect(Timezone::isValid('UTC'))->toBeTrue();
    expect(Timezone::isValid('Europe/London'))->toBeTrue();
});

it('isValid return false untuk null', function () {
    expect(Timezone::isValid(null))->toBeFalse();
});

it('isValid return false untuk empty string', function () {
    expect(Timezone::isValid(''))->toBeFalse();
});

it('isValid return false untuk singkatan WIB/WITA/WIT', function () {
    expect(Timezone::isValid('WIB'))->toBeFalse();
    expect(Timezone::isValid('WITA'))->toBeFalse();
    expect(Timezone::isValid('WIT'))->toBeFalse();
});

it('isValid return false untuk offset timezone', function () {
    expect(Timezone::isValid('+07:00'))->toBeFalse();
    expect(Timezone::isValid('+08:00'))->toBeFalse();
    expect(Timezone::isValid('-05:00'))->toBeFalse();
});

it('isValid return false untuk typo', function () {
    expect(Timezone::isValid('Asia/Makasar'))->toBeFalse();  // 1 's'
    expect(Timezone::isValid('Asia/Jakata'))->toBeFalse();   // 1 'r'
    expect(Timezone::isValid('asia/jakarta'))->toBeFalse();  // lowercase
});

/*
|==========================================================================
| today() — BVA & HAPPY PATH
|==========================================================================
*/

it('today return CarbonImmutable', function () {
    expect(Timezone::today('Asia/Jakarta'))->toBeInstanceOf(CarbonImmutable::class);
});

it('today pakai timezone default jika null', function () {
    $today = Timezone::today();
    expect($today->timezone->getName())->toBe(User::DEFAULT_TIMEZONE);
});

it('today pakai timezone spesifik jika valid', function () {
    $today = Timezone::today('Asia/Jakarta');
    expect($today->timezone->getName())->toBe('Asia/Jakarta');
});

it('today set ke startOfDay (00:00:00)', function () {
    $today = Timezone::today('Asia/Jakarta');
    expect($today->hour)->toBe(0);
    expect($today->minute)->toBe(0);
    expect($today->second)->toBe(0);
});

it('today pakai timezone default jika timezone invalid', function () {
    $today = Timezone::today('Invalid/Zone');
    expect($today->timezone->getName())->toBe(User::DEFAULT_TIMEZONE);
});

/*
|==========================================================================
| now() — HAPPY PATH
|==========================================================================
*/

it('now return CarbonImmutable', function () {
    expect(Timezone::now('Asia/Jakarta'))->toBeInstanceOf(CarbonImmutable::class);
});

it('now pakai timezone default jika null', function () {
    $now = Timezone::now();
    expect($now->timezone->getName())->toBe(User::DEFAULT_TIMEZONE);
});

it('now pakai timezone spesifik jika valid', function () {
    $now = Timezone::now('Asia/Jakarta');
    expect($now->timezone->getName())->toBe('Asia/Jakarta');
});

it('now berbeda dari today (karena now jam 10:30)', function () {
    $now = Timezone::now('UTC');
    $today = Timezone::today('UTC');

    expect($now->hour)->toBe(10);
    expect($today->hour)->toBe(0);
});

/*
|==========================================================================
| toLocal() — HAPPY PATH & EDGE CASES
|==========================================================================
*/

it('toLocal konversi UTC ke timezone lokal', function () {
    // 10:30 UTC → 17:30 WIB (UTC+7)
    $utc = CarbonImmutable::create(2026, 1, 15, 10, 30, 0, 'UTC');
    $local = Timezone::toLocal($utc, 'Asia/Jakarta');

    expect($local->hour)->toBe(17);
    expect($local->minute)->toBe(30);
    expect($local->timezone->getName())->toBe('Asia/Jakarta');
});

it('toLocal dengan timezone default', function () {
    $utc = CarbonImmutable::create(2026, 1, 15, 10, 30, 0, 'UTC');
    $local = Timezone::toLocal($utc);

    expect($local->timezone->getName())->toBe(User::DEFAULT_TIMEZONE);
});

it('toLocal return CarbonImmutable', function () {
    $utc = CarbonImmutable::now('UTC');
    expect(Timezone::toLocal($utc, 'Asia/Jakarta'))->toBeInstanceOf(CarbonImmutable::class);
});

it('toLocal konversi Carbon mutable', function () {
    $utc = Carbon::create(2026, 1, 15, 10, 30, 0, 'UTC');
    $local = Timezone::toLocal($utc, 'Asia/Jakarta');

    expect($local->hour)->toBe(17);
    expect($local)->toBeInstanceOf(CarbonImmutable::class);
});

it('toLocal dari UTC ke UTC tidak berubah', function () {
    $utc = CarbonImmutable::create(2026, 1, 15, 10, 30, 0, 'UTC');
    $local = Timezone::toLocal($utc, 'UTC');

    expect($local->hour)->toBe(10);
    expect($local->minute)->toBe(30);
});

it('toLocal dari WITA ke WIB (UTC+8 → UTC+7)', function () {
    // 10:30 WITA = 02:30 UTC = 09:30 WIB
    $wita = CarbonImmutable::create(2026, 1, 15, 10, 30, 0, 'Asia/Makassar');
    $wib = Timezone::toLocal($wita, 'Asia/Jakarta');

    expect($wib->hour)->toBe(9);
    expect($wib->minute)->toBe(30);
});

/*
|==========================================================================
| options() — HAPPY PATH
|==========================================================================
*/

it('options return array dengan 3 timezone Indonesia', function () {
    $options = Timezone::options();

    expect($options)->toHaveCount(3);
    expect($options)->toHaveKey('Asia/Jakarta');
    expect($options)->toHaveKey('Asia/Makassar');
    expect($options)->toHaveKey('Asia/Jayapura');
});

it('options format value => label', function () {
    $options = Timezone::options();

    expect($options['Asia/Jakarta'])->toBe('WIB (UTC+7)');
    expect($options['Asia/Makassar'])->toBe('WITA (UTC+8)');
    expect($options['Asia/Jayapura'])->toBe('WIT (UTC+9)');
});

/*
|==========================================================================
| offset() — HAPPY PATH
|==========================================================================
*/

it('offset WIB return +07:00', function () {
    expect(Timezone::offset('Asia/Jakarta'))->toBe('+07:00');
});

it('offset WITA return +08:00', function () {
    expect(Timezone::offset('Asia/Makassar'))->toBe('+08:00');
});

it('offset WIT return +09:00', function () {
    expect(Timezone::offset('Asia/Jayapura'))->toBe('+09:00');
});

it('offset UTC return +00:00', function () {
    expect(Timezone::offset('UTC'))->toBe('+00:00');
});

it('offset null fallback ke default (WITA +08:00)', function () {
    expect(Timezone::offset())->toBe('+08:00');
});

it('offset invalid fallback ke default', function () {
    expect(Timezone::offset('Invalid/Zone'))->toBe('+08:00');
});

/*
|==========================================================================
| DEFAULT constant
|==========================================================================
*/

it('DEFAULT sama dengan User::DEFAULT_TIMEZONE', function () {
    expect(Timezone::DEFAULT)->toBe(User::DEFAULT_TIMEZONE);
});

it('DEFAULT = Asia/Makassar', function () {
    expect(Timezone::DEFAULT)->toBe('Asia/Makassar');
});

/*
|==========================================================================
| resolve() — via Reflection
|==========================================================================
*/

it('resolve return timezone jika valid', function () {
    $ref = new ReflectionMethod(Timezone::class, 'resolve');
    $ref->setAccessible(true);

    expect($ref->invoke(null, 'Asia/Jakarta'))->toBe('Asia/Jakarta');
});

it('resolve fallback ke DEFAULT jika null', function () {
    $ref = new ReflectionMethod(Timezone::class, 'resolve');
    $ref->setAccessible(true);

    expect($ref->invoke(null, null))->toBe(Timezone::DEFAULT);
});

it('resolve fallback ke DEFAULT jika empty string', function () {
    $ref = new ReflectionMethod(Timezone::class, 'resolve');
    $ref->setAccessible(true);

    expect($ref->invoke(null, ''))->toBe(Timezone::DEFAULT);
});

it('resolve fallback ke DEFAULT jika invalid', function () {
    $ref = new ReflectionMethod(Timezone::class, 'resolve');
    $ref->setAccessible(true);

    expect($ref->invoke(null, 'Invalid/Zone'))->toBe(Timezone::DEFAULT);
});

/*
|==========================================================================
| EDGE CASES — DST (Daylight Saving Time)
|==========================================================================
*/

it('toLocal handle DST transition (Europe/London)', function () {
    // Januari = winter time (GMT, UTC+0)
    $winter = CarbonImmutable::create(2026, 1, 15, 12, 0, 0, 'UTC');
    $londonWinter = Timezone::toLocal($winter, 'Europe/London');
    expect($londonWinter->hour)->toBe(12); // GMT = UTC+0

    // Juli = summer time (BST, UTC+1)
    $summer = CarbonImmutable::create(2026, 7, 15, 12, 0, 0, 'UTC');
    $londonSummer = Timezone::toLocal($summer, 'Europe/London');
    expect($londonSummer->hour)->toBe(13); // BST = UTC+1
});

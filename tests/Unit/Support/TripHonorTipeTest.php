<?php

use App\Support\TripHonorTipe;

/*
|==========================================================================
| CONSTANTS
|==========================================================================
*/

it('FLAT constant bernilai "flat"', function () {
    expect(TripHonorTipe::FLAT)->toBe('flat');
});

it('PER_HARI constant bernilai "per_hari"', function () {
    expect(TripHonorTipe::PER_HARI)->toBe('per_hari');
});

/*
|==========================================================================
| label() — HAPPY & NEGATIVE PATH
|==========================================================================
*/

it('label FLAT return "Flat (Total)"', function () {
    expect(TripHonorTipe::label(TripHonorTipe::FLAT))->toBe('Flat (Total)');
});

it('label PER_HARI return "Per Hari"', function () {
    expect(TripHonorTipe::label(TripHonorTipe::PER_HARI))->toBe('Per Hari');
});

it('label fallback ke input jika tidak dikenal', function () {
    // Equivalence Partitioning: input invalid → return input as-is
    expect(TripHonorTipe::label('unknown'))->toBe('unknown');
    expect(TripHonorTipe::label(''))->toBe('');
    expect(TripHonorTipe::label('flat '))->toBe('flat '); // spasi
});

it('label case sensitive', function () {
    // 'FLAT' (uppercase) bukan 'flat' → fallback
    expect(TripHonorTipe::label('FLAT'))->toBe('FLAT');
    expect(TripHonorTipe::label('Flat'))->toBe('Flat');
});

/*
|==========================================================================
| values() — HAPPY PATH
|==========================================================================
*/

it('values return array 2 tipe', function () {
    expect(TripHonorTipe::values())->toHaveCount(2);
});

it('values berisi FLAT dan PER_HARI', function () {
    $values = TripHonorTipe::values();

    expect($values)->toContain('flat');
    expect($values)->toContain('per_hari');
});

it('values return list array (index 0, 1)', function () {
    $values = TripHonorTipe::values();

    expect(array_keys($values))->toBe([0, 1]);
});

it('values konsisten antar pemanggilan', function () {
    $a = TripHonorTipe::values();
    $b = TripHonorTipe::values();

    expect($a)->toBe($b);
});

/*
|==========================================================================
| options() — HAPPY PATH
|==========================================================================
*/

it('options return array value => label', function () {
    $options = TripHonorTipe::options();

    expect($options)->toHaveCount(2);
    expect($options)->toHaveKey('flat');
    expect($options)->toHaveKey('per_hari');
});

it('options format benar', function () {
    $options = TripHonorTipe::options();

    expect($options['flat'])->toBe('Flat (Total)');
    expect($options['per_hari'])->toBe('Per Hari');
});

it('options value sama dengan values()', function () {
    $values = TripHonorTipe::values();
    $optionsKeys = array_keys(TripHonorTipe::options());

    expect($optionsKeys)->toBe($values);
});

/*
|==========================================================================
| isValid() — HAPPY & NEGATIVE PATH
|==========================================================================
*/

it('isValid return true untuk FLAT', function () {
    expect(TripHonorTipe::isValid('flat'))->toBeTrue();
});

it('isValid return true untuk PER_HARI', function () {
    expect(TripHonorTipe::isValid('per_hari'))->toBeTrue();
});

it('isValid return false untuk empty string', function () {
    expect(TripHonorTipe::isValid(''))->toBeFalse();
});

it('isValid return false untuk nilai tidak dikenal', function () {
    expect(TripHonorTipe::isValid('unknown'))->toBeFalse();
    expect(TripHonorTipe::isValid('daily'))->toBeFalse();
    expect(TripHonorTipe::isValid('monthly'))->toBeFalse();
});

it('isValid case sensitive (BVA)', function () {
    // BVA: beda 1 karakter besar/kecil → tidak valid
    expect(TripHonorTipe::isValid('FLAT'))->toBeFalse();
    expect(TripHonorTipe::isValid('Flat'))->toBeFalse();
    expect(TripHonorTipe::isValid('PER_HARI'))->toBeFalse();
});

it('isValid false untuk whitespace', function () {
    expect(TripHonorTipe::isValid(' flat'))->toBeFalse();
    expect(TripHonorTipe::isValid('flat '))->toBeFalse();
});

it('isValid konsisten dengan values()', function () {
    foreach (TripHonorTipe::values() as $value) {
        expect(TripHonorTipe::isValid($value))->toBeTrue();
    }
});

/*
|==========================================================================
| EQUIVALENCE PARTITIONING — group test
|==========================================================================
*/

it('label dan isValid konsisten', function () {
    // Untuk setiap value valid, label return non-empty dan isValid true
    foreach (TripHonorTipe::values() as $value) {
        expect(TripHonorTipe::isValid($value))->toBeTrue();
        expect(TripHonorTipe::label($value))->not->toBeEmpty();
        expect(TripHonorTipe::label($value))->not->toBe($value); // label beda dari value
    }
});

<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)   // ← aktifkan untuk Feature
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Unit');                    // ← Unit test TIDAK butuh DB

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Global Test Helpers
|--------------------------------------------------------------------------
| Di-load sekali, dipakai di seluruh test suite.
| Gunakan guard function_exists() agar tidak error saat hot-reload.
*/

require_once __DIR__.'/Helpers/UserHelper.php';
require_once __DIR__.'/Helpers/PackageHelper.php';

<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Authentication Rate Limiting
    |--------------------------------------------------------------------------
    |
    | Konfigurasi rate limit untuk endpoint autentikasi.
    | Nilai dapat di-override via .env untuk testing atau tuning produksi.
    |
    | Setiap limiter memiliki:
    | - max_attempts: jumlah percobaan maksimal sebelum diblokir
    | - decay_seconds: durasi (detik) sebelum hitungan di-reset
    | - test_override: override untuk test rate limit (opsional)
    |
    */

    'login' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_LOGIN_MAX', 5),
        'decay_seconds' => (int) env('AUTH_THROTTLE_LOGIN_DECAY', 60),
        'test_override' => env('AUTH_THROTTLE_LOGIN_TEST_OVERRIDE'),
    ],

    'register' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_REGISTER_MAX', 3),
        'decay_seconds' => (int) env('AUTH_THROTTLE_REGISTER_DECAY', 60),
        'test_override' => env('AUTH_THROTTLE_REGISTER_TEST_OVERRIDE'),
    ],

    'forgot-password' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_FORGOT_MAX', 3),
        'decay_seconds' => (int) env('AUTH_THROTTLE_FORGOT_DECAY', 60),
        'test_override' => env('AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE'),
    ],

    'reset-password' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_RESET_MAX', 5),
        'decay_seconds' => (int) env('AUTH_THROTTLE_RESET_DECAY', 60),
        'test_override' => env('AUTH_THROTTLE_RESET_PASSWORD_TEST_OVERRIDE'),
    ],
    'contact' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_CONTACT_MAX', 3),
        'decay_seconds' => (int) env('AUTH_THROTTLE_CONTACT_DECAY', 60),
        'test_override' => env('AUTH_THROTTLE_CONTACT_TEST_OVERRIDE'),
    ],
];

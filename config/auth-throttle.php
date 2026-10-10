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
    */

    'login' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_LOGIN_MAX', 5),
        'decay_seconds' => (int) env('AUTH_THROTTLE_LOGIN_DECAY', 60),
    ],

    'register' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_REGISTER_MAX', 3),
        'decay_seconds' => (int) env('AUTH_THROTTLE_REGISTER_DECAY', 60),
    ],

    'forgot-password' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_FORGOT_MAX', 3),
        'decay_seconds' => (int) env('AUTH_THROTTLE_FORGOT_DECAY', 60),
    ],

    'reset-password' => [
        'max_attempts' => (int) env('AUTH_THROTTLE_RESET_MAX', 5),
        'decay_seconds' => (int) env('AUTH_THROTTLE_RESET_DECAY', 60),
    ],
];

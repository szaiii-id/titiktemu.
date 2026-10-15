<?php

use App\Models\Profile;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| User Helpers
|--------------------------------------------------------------------------
| Fungsi global untuk membuat instance model User/Profile di test
| tanpa menyentuh database. Semua fungsi di-guard dengan
| function_exists() untuk mencegah "Cannot redeclare function".
*/

if (! function_exists('makeUser')) {
    /**
     * Buat instance User baru yang terisi via forceFill()
     * (tidak bergantung pada $fillable model).
     *
     * @param  array<string, mixed>  $attributes
     */
    function makeUser(array $attributes = []): User
    {
        $user = new User;
        $user->forceFill($attributes);

        return $user;
    }
}

if (! function_exists('makeUserWithProfile')) {
    /**
     * Buat User + set relasi 'profile' (null atau Profile instance).
     *
     * @param  array<string, mixed>  $userAttrs
     */
    function makeUserWithProfile(array $userAttrs = [], ?Profile $profile = null): User
    {
        $user = makeUser($userAttrs);
        $user->setRelation('profile', $profile);

        return $user;
    }
}

if (! function_exists('makeProfile')) {
    /**
     * Buat instance Profile baru.
     *
     * @param  array<string, mixed>  $attributes
     */
    function makeProfile(array $attributes = []): Profile
    {
        $profile = new Profile;
        $profile->forceFill($attributes);

        return $profile;
    }
}

if (! function_exists('makeSocialiteUser')) {
    /**
     * Buat mock SocialiteUser dengan data umum.
     * Berguna untuk test Google OAuth login.
     */
    function makeSocialiteUser(
        string $id = 'google-123',
        string $email = 'budi@example.com',
        string $name = 'Budi',
    ): Laravel\Socialite\Contracts\User {
        $mock = Mockery::mock(Laravel\Socialite\Contracts\User::class);
        $mock->shouldReceive('getId')->andReturn($id);
        $mock->shouldReceive('getEmail')->andReturn($email);
        $mock->shouldReceive('getName')->andReturn($name);

        return $mock;
    }
}

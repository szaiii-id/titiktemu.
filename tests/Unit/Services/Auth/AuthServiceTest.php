<?php

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Services\Auth\AuthService;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Contracts\User as SocialiteUser;

beforeEach(function () {
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->authService = new AuthService($this->userRepository);
});

afterEach(function () {
    Mockery::close();
});

/*
|==========================================================================
| registerClient()
|==========================================================================
*/

it('mendaftarkan client dan langsung login', function () {
    // ARRANGE
    $data = [
        'name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'username' => 'budisantoso',
        'password' => 'password123',
    ];

    $user = makeUser(['name' => 'Budi Santoso', 'email' => 'budi@example.com']);

    $this->userRepository
        ->shouldReceive('createClient')
        ->once()
        ->with($data)
        ->andReturn($user);

    Auth::shouldReceive('login')
        ->once()
        ->with($user);

    // ACT
    $result = $this->authService->registerClient($data);

    // ASSERT
    expect($result)->toBe($user);
});

it('registerClient tidak memanggil findByEmailOrUsername atau findByEmail', function () {
    // Behavioral: pastikan registerClient hanya menyentuh createClient
    $data = [
        'name' => 'X',
        'email' => 'x@example.com',
        'username' => 'x',
        'password' => 'p',
    ];

    $user = makeUser(['id' => 1]);

    $this->userRepository->shouldReceive('createClient')
        ->once()->andReturn($user);

    $this->userRepository->shouldNotReceive('findByEmailOrUsername');
    $this->userRepository->shouldNotReceive('findByEmail');
    $this->userRepository->shouldNotReceive('findByGoogleId');

    Auth::shouldReceive('login')->once()->with($user);

    $this->authService->registerClient($data);
});

/*
|==========================================================================
| login() — Happy Path & Negative Path
|==========================================================================
*/

it('berhasil login dengan kredensial yang benar', function () {
    // ARRANGE
    $hashedPassword = Hash::make('password123');
    $user = makeUser([
        'email' => 'budi@example.com',
        'password' => $hashedPassword,
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->with('budi@example.com')
        ->andReturn($user);

    Auth::shouldReceive('login')
        ->once()
        ->with($user, false);

    // ACT
    $result = $this->authService->login('budi@example.com', 'password123');

    // ASSERT
    expect($result)->toBe($user);
});

it('berhasil login menggunakan username (dual-login)', function () {
    // Equivalence: identitas = username (bukan email)
    $user = makeUser([
        'username' => 'budisantoso',
        'password' => Hash::make('password123'),
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->with('budisantoso')
        ->andReturn($user);

    Auth::shouldReceive('login')->once()->with($user, false);

    $result = $this->authService->login('budisantoso', 'password123');

    expect($result)->toBe($user);
});

it('melempar ValidationException jika password salah', function () {
    // ARRANGE
    $user = makeUser([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->andReturn($user);

    // ASSERT: user ditemukan tapi password salah → tidak boleh login
    Auth::shouldReceive('login')->never();

    // ACT + ASSERT
    expect(fn () => $this->authService->login('budi@example.com', 'password-salah'))
        ->toThrow(ValidationException::class);
});

it('melempar ValidationException jika user tidak ditemukan', function () {
    // ARRANGE
    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->andReturn(null);

    // ASSERT: repository return null → Auth::login tidak boleh dipanggil
    Auth::shouldReceive('login')->never();

    // ACT + ASSERT
    expect(fn () => $this->authService->login('tidak-ada@example.com', 'apapun'))
        ->toThrow(ValidationException::class);
});

it('melempar ValidationException jika password kosong string', function () {
    // BVA: password = '' (boundary empty)
    $user = makeUser([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->andReturn($user);

    Auth::shouldReceive('login')->never();

    expect(fn () => $this->authService->login('budi@example.com', ''))
        ->toThrow(ValidationException::class);
});

it('login dengan remember = true memanggil Auth::login dengan parameter remember', function () {
    // ARRANGE
    $user = makeUser([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->andReturn($user);

    Auth::shouldReceive('login')
        ->once()
        ->with($user, true); // ← eksplisit true

    // ACT
    $this->authService->login('budi@example.com', 'password123', true);
});

it('login dengan remember = false eksplisit → Auth::login($user, false)', function () {
    // BVA: eksplisit false (boundary dari bool)
    $user = makeUser([
        'email' => 'budi@example.com',
        'password' => Hash::make('password123'),
    ]);

    $this->userRepository
        ->shouldReceive('findByEmailOrUsername')
        ->once()
        ->andReturn($user);

    Auth::shouldReceive('login')->once()->with($user, false);

    $this->authService->login('budi@example.com', 'password123', false);
});

/*
|==========================================================================
| handleGoogleLogin() — Edge Cases
|==========================================================================
*/

it('login google dengan user yang sudah terdaftar via Google ID', function () {
    // ARRANGE
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-123');
    // getEmail & getName tidak boleh dipanggil karena user langsung ketemu via Google ID
    $googleUser->shouldReceive('getEmail')->never();
    $googleUser->shouldReceive('getName')->never();

    $user = makeUser(['email' => 'budi@example.com', 'google_id' => 'google-123']);

    $this->userRepository
        ->shouldReceive('findByGoogleId')
        ->once()
        ->with('google-123')
        ->andReturn($user);

    $this->userRepository->shouldReceive('findByEmail')->never();
    $this->userRepository->shouldReceive('createClient')->never();

    Auth::shouldReceive('login')->once()->with($user);

    // ACT
    $result = $this->authService->handleGoogleLogin($googleUser);

    // ASSERT
    expect($result)->toBe($user);
});

it('login google TIDAK memanggil findByEmail jika findByGoogleId ketemu', function () {
    // Behavioral: short-circuit verification
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-xyz');
    $googleUser->shouldReceive('getEmail')->never();
    $googleUser->shouldReceive('getName')->never();

    $user = makeUser(['id' => 1, 'google_id' => 'google-xyz']);

    $this->userRepository->shouldReceive('findByGoogleId')
        ->once()->andReturn($user);
    $this->userRepository->shouldNotReceive('findByEmail');
    $this->userRepository->shouldNotReceive('createClient');

    Auth::shouldReceive('login')->once()->with($user);

    $this->authService->handleGoogleLogin($googleUser);
});

it('menautkan google_id ke user lama yang terdaftar via email', function () {
    // ARRANGE
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-456');
    $googleUser->shouldReceive('getEmail')->once()->andReturn('budi@example.com');
    $googleUser->shouldReceive('getName')->never(); // tidak dipakai karena user lama ketemu

    $user = Mockery::mock(User::class);
    $user->shouldReceive('update')
        ->once()
        ->with(['google_id' => 'google-456'])
        ->andReturn(true);

    $this->userRepository
        ->shouldReceive('findByGoogleId')
        ->once()
        ->andReturn(null);

    $this->userRepository
        ->shouldReceive('findByEmail')
        ->once()
        ->with('budi@example.com')
        ->andReturn($user);

    $this->userRepository->shouldReceive('createClient')->never();

    Auth::shouldReceive('login')->once()->with($user);

    // ACT
    $this->authService->handleGoogleLogin($googleUser);
});

it('membuat client baru jika google user benar-benar baru', function () {
    // ARRANGE
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-789');
    // getEmail dipanggil 2x: sekali untuk findByEmail, sekali untuk createClient
    $googleUser->shouldReceive('getEmail')->twice()->andReturn('baru@example.com');
    $googleUser->shouldReceive('getName')->once()->andReturn('User Baru');

    $this->userRepository
        ->shouldReceive('findByGoogleId')
        ->once()
        ->andReturn(null);

    $this->userRepository
        ->shouldReceive('findByEmail')
        ->once()
        ->andReturn(null);

    $newUser = makeUser(['email' => 'baru@example.com']);

    $this->userRepository
        ->shouldReceive('createClient')
        ->once()
        ->with(Mockery::on(function ($data) {
            return $data['email'] === 'baru@example.com'
                && $data['name'] === 'User Baru'
                && $data['google_id'] === 'google-789'
                && $data['password'] === null
                && preg_match('/^baru\d{3}$/', $data['username']);
        }))
        ->andReturn($newUser);

    Auth::shouldReceive('login')->once()->with($newUser);

    // ACT
    $result = $this->authService->handleGoogleLogin($googleUser);

    // ASSERT
    expect($result)->toBe($newUser);
});

it('username hasil generate google login selalu 3 digit angka di akhir', function () {
    // BVA: verifikasi format username `{local}\d{3}`
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-bva');
    $googleUser->shouldReceive('getEmail')->twice()->andReturn('user@example.com');
    $googleUser->shouldReceive('getName')->once()->andReturn('User');

    $this->userRepository->shouldReceive('findByGoogleId')->once()->andReturn(null);
    $this->userRepository->shouldReceive('findByEmail')->once()->andReturn(null);

    $this->userRepository->shouldReceive('createClient')
        ->once()
        ->with(Mockery::on(function ($data) {
            // format: "user" + 3 digit angka
            return preg_match('/^user\d{3}$/', $data['username']) === 1;
        }))
        ->andReturn(makeUser(['id' => 1]));

    Auth::shouldReceive('login')->once();

    $this->authService->handleGoogleLogin($googleUser);
});

it('handleGoogleLogin memanggil repository dalam urutan yang benar (user baru)', function () {
    // Behavioral: ordered verification
    $googleUser = Mockery::mock(SocialiteUser::class);
    $googleUser->shouldReceive('getId')->andReturn('google-order');
    $googleUser->shouldReceive('getEmail')->twice()->andReturn('order@example.com');
    $googleUser->shouldReceive('getName')->once()->andReturn('Order');

    $this->userRepository->shouldReceive('findByGoogleId')
        ->once()->andReturn(null)->ordered();

    $this->userRepository->shouldReceive('findByEmail')
        ->once()->andReturn(null)->ordered();

    $newUser = makeUser(['id' => 1]);

    $this->userRepository->shouldReceive('createClient')
        ->once()->andReturn($newUser)->ordered();

    Auth::shouldReceive('login')->once()->with($newUser);

    $this->authService->handleGoogleLogin($googleUser);
});

/*
|==========================================================================
| resolveRedirectAfterLogin() — BVA & Equivalence Partitioning
|==========================================================================
*/

it('redirect ke halaman ganti password jika must_change_password = true', function () {
    // ARRANGE — prioritas tertinggi, mengalahkan role apapun
    $user = makeUser([
        'role' => 'admin',
        'must_change_password' => true,
    ]);

    // ACT
    $result = $this->authService->resolveRedirectAfterLogin($user);

    // ASSERT
    expect($result['must_change_password'])->toBeTrue();
    expect($result['url'])->toBe(route('password.change'));
});

it('redirect admin ke dashboard admin', function () {
    $user = makeUser(['role' => 'admin', 'must_change_password' => false]);

    $result = $this->authService->resolveRedirectAfterLogin($user);

    expect($result['must_change_password'])->toBeFalse();
    expect($result['url'])->toBe(route('admin.dashboard'));
});

it('redirect mitra ke dashboard mitra', function () {
    $user = makeUser(['role' => 'mitra', 'must_change_password' => false]);

    $result = $this->authService->resolveRedirectAfterLogin($user);

    expect($result['url'])->toBe(route('mitra.dashboard'));
});

it('redirect client ke dashboard client', function () {
    $user = makeUser(['role' => 'client', 'must_change_password' => false]);

    $result = $this->authService->resolveRedirectAfterLogin($user);

    expect($result['url'])->toBe(route('client.dashboard'));
});

it('must_change_password = true menang atas role apapun', function () {
    $user = makeUser(['role' => 'mitra', 'must_change_password' => true]);

    $result = $this->authService->resolveRedirectAfterLogin($user);

    expect($result['must_change_password'])->toBeTrue();
    expect($result['url'])->toBe(route('password.change'));
});

it('must_change_password = true redirect ke password.change bahkan untuk admin', function () {
    $user = makeUser(['role' => 'admin', 'must_change_password' => true]);

    $result = $this->authService->resolveRedirectAfterLogin($user);

    expect($result['must_change_password'])->toBeTrue();
    expect($result['url'])->toBe(route('password.change'));
});

it('must_change_password = true menang atas role default sekalipun', function () {
    $user = makeUser(['role' => 'unknown', 'must_change_password' => true]);

    $result = $this->authService->resolveRedirectAfterLogin($user);

    expect($result['must_change_password'])->toBeTrue();
    expect($result['url'])->toBe(route('password.change'));
});

it('must_change_password = true juga menang jika role = null', function () {
    // Edge: kombinasi dua edge case
    $user = makeUser(['role' => null, 'must_change_password' => true]);

    $result = $this->authService->resolveRedirectAfterLogin($user);

    expect($result['must_change_password'])->toBeTrue();
    expect($result['url'])->toBe(route('password.change'));
});

/*
|==========================================================================
| logout() — Behavioral & Interaction Testing
|==========================================================================
*/

it('logout memanggil Auth::logout, invalidate session, dan regenerate token', function () {
    // ARRANGE
    Auth::shouldReceive('logout')->once();

    $session = Mockery::mock(Session::class);
    $session->shouldReceive('invalidate')->once();
    $session->shouldReceive('regenerateToken')->once();

    $request = Request::create('/');
    $request->setLaravelSession($session);

    $this->app->instance('request', $request);

    // ACT
    $this->authService->logout();

    // ASSERT (diverifikasi via mock expectation di atas)
    expect(true)->toBeTrue();
});

it('logout menghapus semua cookie remember_* yang ada', function () {
    // ARRANGE
    Auth::shouldReceive('logout')->once();

    $session = Mockery::mock(Session::class);
    $session->shouldReceive('invalidate')->once();
    $session->shouldReceive('regenerateToken')->once();

    $request = Request::create('/');
    $request->setLaravelSession($session);

    // Simulasi 2 cookie remember_* + 1 cookie biasa
    $request->cookies->set('remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d', 'token-value');
    $request->cookies->set('remember_admin_abc123', 'token-admin');
    $request->cookies->set('regular_cookie', 'should-not-be-forgotten');

    $this->app->instance('request', $request);

    // ASSERT: Cookie::queue dipanggil TEPAT 2x (hanya untuk remember_*)
    Cookie::shouldReceive('forget')
        ->twice()
        ->andReturnUsing(function ($name) {
            // Pastikan yang di-forget hanya cookie remember_*
            expect($name)->toStartWith('remember_');

            return new Symfony\Component\HttpFoundation\Cookie($name, '', -1);
        });

    Cookie::shouldReceive('queue')
        ->twice()
        ->andReturnNull();

    // ACT
    $this->authService->logout();
});

it('logout dengan tidak ada cookie remember_* → Cookie::forget tidak dipanggil', function () {
    // BVA: boundary n = 0 cookie remember
    Auth::shouldReceive('logout')->once();

    $session = Mockery::mock(Session::class);
    $session->shouldReceive('invalidate')->once();
    $session->shouldReceive('regenerateToken')->once();

    $request = Request::create('/');
    $request->setLaravelSession($session);

    // Hanya cookie biasa
    $request->cookies->set('regular_cookie', 'value');
    $request->cookies->set('session_id', 'xyz');

    $this->app->instance('request', $request);

    // Cookie::forget TIDAK boleh dipanggil
    Cookie::shouldReceive('forget')->never();
    Cookie::shouldReceive('queue')->never();

    // ACT
    $this->authService->logout();

    expect(true)->toBeTrue();
});

it('logout dengan TEPAT 1 cookie remember_* → Cookie::forget dipanggil 1x', function () {
    // BVA: boundary n = 1
    Auth::shouldReceive('logout')->once();

    $session = Mockery::mock(Session::class);
    $session->shouldReceive('invalidate')->once();
    $session->shouldReceive('regenerateToken')->once();

    $request = Request::create('/');
    $request->setLaravelSession($session);

    $request->cookies->set('remember_web_abc', 'token');

    $this->app->instance('request', $request);

    Cookie::shouldReceive('forget')
        ->once()
        ->with('remember_web_abc')
        ->andReturn(new Symfony\Component\HttpFoundation\Cookie('remember_web_abc', '', -1));

    Cookie::shouldReceive('queue')
        ->once()
        ->andReturnNull();

    // ACT
    $this->authService->logout();
});

it('logout TIDAK menghapus cookie biasa (non remember_*)', function () {
    // Behavioral: verifikasi filter prefix remember_
    Auth::shouldReceive('logout')->once();

    $session = Mockery::mock(Session::class);
    $session->shouldReceive('invalidate')->once();
    $session->shouldReceive('regenerateToken')->once();

    $request = Request::create('/');
    $request->setLaravelSession($session);

    $request->cookies->set('regular_cookie', 'should-keep');
    $request->cookies->set('XSRF-TOKEN', 'should-keep');
    $request->cookies->set('laravel_session', 'should-keep');

    $this->app->instance('request', $request);

    Cookie::shouldReceive('forget')->never();
    Cookie::shouldReceive('queue')->never();

    $this->authService->logout();
});

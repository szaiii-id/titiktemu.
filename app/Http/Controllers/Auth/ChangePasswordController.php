<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Services\Auth\AuthService;
use App\Services\User\PasswordService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ChangePasswordController extends Controller
{
    public function __construct(
        protected PasswordService $passwordService,
        protected AuthService $authService,
    ) {}

    /**
     * Tampilkan halaman ganti password.
     */
    public function edit(): InertiaResponse
    {
        return Inertia::render('Auth/ChangePassword', [
            'mustChangePassword' => (bool) auth()->user()->must_change_password,
        ]);
    }

    /**
     * Proses ganti password.
     *
     * Logika bisnis ada di PasswordService::handleChangePassword().
     * Controller hanya handle HTTP (redirect, flash message).
     */
    public function update(ChangePasswordRequest $request): RedirectResponse
    {
        $user = $request->user();

        $result = $this->passwordService->handleChangePassword(
            user: $user,
            oldPassword: $request->validated('old_password'),
            newPassword: $request->validated('password'),
        );

        // === Wajib ganti → logout & minta login ulang ===
        if ($result['should_logout']) {
            $this->authService->logout();

            return redirect()
                ->route('login')
                ->with('status', $result['message']);
        }

        // === Ganti biasa → redirect ke dashboard role ===
        $redirect = $this->authService->resolveRedirectAfterLogin($user);

        return redirect()
            ->to($redirect['url'])
            ->with('status', $result['message']);
    }
}

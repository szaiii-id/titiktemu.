<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class PasswordResetController extends Controller
{
    public function create(): InertiaResponse
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function store(ForgotPasswordRequest $request): RedirectResponse
    {
        $status = Password::sendResetLink(
            $request->only('email')
        );

        return match ($status) {
            Password::RESET_LINK_SENT => back()->with('status', 'Tautan pemulihan password telah dikirim ke email Anda.'),
            Password::RESET_THROTTLED => back()->withErrors(['email' => 'Mohon tunggu beberapa saat sebelum meminta tautan baru.']),
            default => back()->withErrors(['email' => 'Gagal mengirim tautan reset password.']),
        };
    }

    public function edit(Request $request, string $token): InertiaResponse
    {
        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => $request->email,
        ]);
    }

    public function update(ResetPasswordRequest $request): RedirectResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user) use ($request): void {
                $user->forceFill([
                    'password' => $request->password,
                ])->save();
            }
        );

        return $status == Password::PASSWORD_RESET
            ? redirect()->route('login')->with('status', 'Password berhasil diubah. Silakan masuk.')
            : back()->withErrors(['email' => [__($status)]]);
    }
}

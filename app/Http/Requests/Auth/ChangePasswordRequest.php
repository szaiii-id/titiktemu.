<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    /**
     * Hanya user yang sudah login yang boleh ganti password.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Aturan validasi.
     *
     * Field `old_password` hanya wajib jika user TIDAK dalam status
     * wajib ganti password (must_change_password = false).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $mustChange = (bool) $this->user()?->must_change_password;

        return [
            'old_password' => $mustChange
                ? ['nullable', 'string']
                : ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }

    /**
     * Pesan error kustom.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'old_password.required' => 'Password lama wajib diisi.',
            'old_password.current_password' => 'Password lama tidak sesuai.',
            'password.required' => 'Password baru wajib diisi.',
            'password.confirmed' => 'Konfirmasi password baru tidak cocok.',
        ];
    }
}

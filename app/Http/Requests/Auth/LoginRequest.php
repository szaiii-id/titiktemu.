<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'identitas' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Pesan error kustom untuk form login
     */
    public function messages(): array
    {
        return [
            'identitas.required' => 'Username atau email wajib diisi.',
            'password.required' => 'Kata sandi wajib diisi.',
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        $role = $this->input('role');

        $rules = [
            'role' => ['required', 'string', Rule::in(['admin', 'mitra'])],
            'name' => ['required', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255', 'unique:users,username'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', Password::defaults()],
        ];

        // Field profile hanya untuk mitra (opsional)
        if ($role === 'mitra') {
            $rules = array_merge($rules, [
                'nama_penyedia_usaha' => ['nullable', 'string', 'max:255'],
                'nomor_identitas' => ['nullable', 'string', 'max:255'],
                'alamat' => ['nullable', 'string', 'max:1000'],
                'telepon' => ['nullable', 'string', 'max:50'],
                'provinsi' => ['nullable', 'string', 'max:255'],
                'kota' => ['nullable', 'string', 'max:255'],
                'kode_pos' => ['nullable', 'string', 'max:20'],
                'deskripsi' => ['nullable', 'string', 'max:5000'],
            ]);
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Role tidak valid. Hanya admin atau mitra yang diizinkan.',
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah digunakan.',
            'username.unique' => 'Username sudah digunakan.',
        ];
    }
}

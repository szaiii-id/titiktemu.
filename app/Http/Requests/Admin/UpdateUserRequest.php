<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
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
        // ✅ FIX PHPStan: `route('user')` return object|string|null.
        // Kita hanya ambil ID kalau tipenya User (route model binding).
        $routeUser = $this->route('user');
        $userId = $routeUser instanceof User ? $routeUser->id : null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'username' => [
                'nullable', 'string', 'max:255',
                Rule::unique('users', 'username')->ignore($userId),
            ],
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            // Profile (opsional)
            'profile' => ['nullable', 'array'],
            'profile.nama_penyedia_usaha' => ['nullable', 'string', 'max:255'],
            'profile.nomor_identitas' => ['nullable', 'string', 'max:255'],
            'profile.alamat' => ['nullable', 'string', 'max:1000'],
            'profile.telepon' => ['nullable', 'string', 'max:50'],
            'profile.provinsi' => ['nullable', 'string', 'max:255'],
            'profile.kota' => ['nullable', 'string', 'max:255'],
            'profile.kode_pos' => ['nullable', 'string', 'max:20'],
            'profile.deskripsi' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah digunakan.',
            'username.unique' => 'Username sudah digunakan.',
        ];
    }
}

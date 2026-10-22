<?php

namespace App\Http\Requests\Admin;

use App\Enums\TripMitraRole;
use App\Support\TripHonorTipe;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignMitraRequest extends FormRequest
{
    /**
     * Hanya admin yang boleh assign mitra.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
     * Aturan validasi.
     *
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'mitra_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'mitra'),
            ],
            'role' => [
                'required',
                'string',
                Rule::in(TripMitraRole::values()),
            ],
            'honor' => ['required', 'numeric', 'min:1', 'max:9999999999.99'],
            'honor_tipe' => [
                'required',
                'string',
                Rule::in(TripHonorTipe::values()),
            ],
            'instruksi' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Pesan error Bahasa Indonesia.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mitra_id.required' => 'Mitra wajib dipilih.',
            'mitra_id.exists' => 'Mitra yang dipilih tidak valid atau bukan user dengan role mitra.',
            'role.required' => 'Role wajib dipilih.',
            'role.in' => 'Role tidak valid.',
            'honor.required' => 'Honor wajib diisi.',
            'honor.numeric' => 'Honor harus berupa angka.',
            'honor.min' => 'Honor harus lebih dari 0.',
            'honor.max' => 'Honor terlalu besar.',
            'honor_tipe.required' => 'Tipe honor wajib dipilih.',
            'honor_tipe.in' => 'Tipe honor tidak valid.',
            'instruksi.max' => 'Instruksi maksimal 2000 karakter.',
        ];
    }

    /**
     * Attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'mitra_id' => 'mitra',
            'role' => 'role',
            'honor' => 'honor',
            'honor_tipe' => 'tipe honor',
            'instruksi' => 'instruksi',
        ];
    }
}

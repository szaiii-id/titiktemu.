<?php

namespace App\Http\Requests\Admin;

use App\Enums\TripMitraRole;
use App\Support\TripHonorTipe;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTripMitraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'role' => ['nullable', 'string', Rule::in(TripMitraRole::values())],
            'honor' => ['nullable', 'numeric', 'min:1', 'max:9999999999.99'],
            'honor_tipe' => ['nullable', 'string', Rule::in(TripHonorTipe::values())],
            'instruksi' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role.in' => 'Role tidak valid.',
            'honor.numeric' => 'Honor harus berupa angka.',
            'honor.min' => 'Honor harus lebih dari 0.',
            'honor.max' => 'Honor terlalu besar.',
            'honor_tipe.in' => 'Tipe honor tidak valid.',
            'instruksi.max' => 'Instruksi maksimal 2000 karakter.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'role' => 'role',
            'honor' => 'honor',
            'honor_tipe' => 'tipe honor',
            'instruksi' => 'instruksi',
        ];
    }
}

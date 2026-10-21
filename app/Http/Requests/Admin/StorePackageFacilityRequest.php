<?php

namespace App\Http\Requests\Admin;

use App\Enums\PackageFacilityTipe;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePackageFacilityRequest extends FormRequest
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
            'tipe' => ['required', 'string', Rule::in(PackageFacilityTipe::values())],
            'nama' => ['required', 'string', 'min:2', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tipe.required' => 'Tipe fasilitas wajib dipilih.',
            'tipe.in' => 'Tipe fasilitas tidak valid.',
            'nama.required' => 'Nama fasilitas wajib diisi.',
            'nama.min' => 'Nama fasilitas minimal 2 karakter.',
            'nama.max' => 'Nama fasilitas maksimal 255 karakter.',
        ];
    }
}

<?php

namespace App\Http\Requests\Admin;

use App\Enums\PackageDayCostKategori;
use App\Enums\PackageDayCostSatuan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePackageDayCostRequest extends FormRequest
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
            'nama_biaya' => ['required', 'string', 'min:2', 'max:255'],
            'kategori' => ['required', 'string', Rule::in(PackageDayCostKategori::values())],
            'jumlah' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'satuan' => ['required', 'string', Rule::in(PackageDayCostSatuan::values())],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'nama_biaya.required' => 'Nama biaya wajib diisi.',
            'nama_biaya.min' => 'Nama biaya minimal 2 karakter.',
            'nama_biaya.max' => 'Nama biaya maksimal 255 karakter.',
            'kategori.required' => 'Kategori wajib dipilih.',
            'kategori.in' => 'Kategori tidak valid.',
            'jumlah.required' => 'Jumlah wajib diisi.',
            'jumlah.numeric' => 'Jumlah harus berupa angka.',
            'jumlah.min' => 'Jumlah tidak boleh negatif.',
            'jumlah.max' => 'Jumlah terlalu besar.',
            'satuan.required' => 'Satuan wajib dipilih.',
            'satuan.in' => 'Satuan tidak valid.',
            'catatan.max' => 'Catatan maksimal 1000 karakter.',
        ];
    }
}

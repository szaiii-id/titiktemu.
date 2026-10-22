<?php

namespace App\Http\Requests\Mitra;

use Illuminate\Foundation\Http\FormRequest;

class StorePayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isMitra() === true;
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'jumlah' => ['required', 'numeric', 'min:100000', 'max:9999999999.99'],
            'bank_tujuan' => ['required', 'string', 'max:100'],
            'no_rekening' => ['required', 'string', 'max:50'],
            'nama_pemilik' => ['required', 'string', 'max:255'],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'jumlah.required' => 'Jumlah wajib diisi.',
            'jumlah.numeric' => 'Jumlah harus berupa angka.',
            'jumlah.min' => 'Minimum pencairan Rp 100.000.',
            'bank_tujuan.required' => 'Bank tujuan wajib diisi.',
            'no_rekening.required' => 'No rekening wajib diisi.',
            'nama_pemilik.required' => 'Nama pemilik rekening wajib diisi.',
        ];
    }
}

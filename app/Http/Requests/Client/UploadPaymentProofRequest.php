<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class UploadPaymentProofRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isClient() === true;
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'jumlah' => ['nullable', 'numeric', 'min:0'],
            'bank_pengirim' => ['nullable', 'string', 'max:100'],
            'nama_pengirim' => ['nullable', 'string', 'max:255'],
            'bukti_transfer' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'bukti_transfer.image' => 'Bukti transfer harus berupa gambar.',
            'bukti_transfer.mimes' => 'Format bukti transfer harus JPG, PNG, atau WEBP.',
            'bukti_transfer.max' => 'Ukuran bukti transfer maksimal 2 MB.',
            'jumlah.numeric' => 'Jumlah harus berupa angka.',
            'jumlah.min' => 'Jumlah tidak boleh negatif.',
            'catatan.max' => 'Catatan maksimal 1000 karakter.',
        ];
    }
}

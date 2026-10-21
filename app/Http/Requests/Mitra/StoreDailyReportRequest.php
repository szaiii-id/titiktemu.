<?php

namespace App\Http\Requests\Mitra;

use Illuminate\Foundation\Http\FormRequest;

class StoreDailyReportRequest extends FormRequest
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
            'catatan' => ['nullable', 'string', 'max:2000'],
            'media' => ['required', 'array', 'min:1', 'max:2'],
            'media.*' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'catatan.max' => 'Catatan maksimal 2000 karakter.',
            'media.required' => 'Minimal 1 foto bukti wajib diupload.',
            'media.array' => 'Foto tidak valid.',
            'media.min' => 'Minimal 1 foto bukti wajib diupload.',
            'media.max' => 'Maksimal 2 foto bukti.',
            'media.*.required' => 'Foto tidak boleh kosong.',
            'media.*.file' => 'Upload harus berupa file.',
            'media.*.image' => 'File harus berupa gambar.',
            'media.*.mimes' => 'Format foto harus JPG, JPEG, PNG, atau WEBP.',
            'media.*.max' => 'Ukuran setiap foto maksimal 2 MB.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'catatan' => 'catatan',
            'media' => 'foto bukti',
        ];
    }
}

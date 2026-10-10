<?php

namespace App\Services\LandingPage;

use Illuminate\Support\Facades\Mail;

class ContactService
{
    /**
     * Kirim pesan kontak ke email admin.
     */
    public function send(array $data): void
    {
        $recipient = config('mail.contact_recipient');

        Mail::raw(
            $this->buildBody($data),
            function ($message) use ($data, $recipient) {
                $message->to($recipient)
                    ->replyTo($data['email'], $data['nama'])
                    ->subject('Pesan Kontak Baru — ' . $data['nama']);
            }
        );
    }

    /**
     * Susun isi email dalam format teks.
     */
    protected function buildBody(array $data): string
    {
        return <<<TEXT
        Pesan kontak baru dari halaman landing Titiktemu.

        Nama    : {$data['nama']}
        Email   : {$data['email']}
        Waktu   : {$this->formatTime()}

        Pesan:
        {$data['pesan']}

        ---
        Email ini dikirim otomatis dari form kontak titiktemu.
        Balas langsung ke email pengirim untuk merespons.
        TEXT;
    }

    /**
     * Format waktu pengiriman.
     */
    protected function formatTime(): string
    {
        return now()->translatedFormat('l, d F Y H:i') . ' WIB';
    }
}
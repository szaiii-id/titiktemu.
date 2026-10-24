<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>E-Ticket <?php echo e($booking->kode); ?></title>
    <style>
        body { font-family: sans-serif; color: #232323; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 28px; margin: 0; color: #B81A6A; }
        .header p { font-size: 12px; color: #666; margin: 4px 0; }
        .card { border: 2px solid #B81A6A; border-radius: 12px; padding: 20px; margin-top: 20px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { font-size: 10px; color: #666; text-transform: uppercase; }
        .value { font-size: 13px; font-weight: bold; color: #232323; }
        .qr { text-align: center; margin: 20px 0; }
        .qr img { width: 200px; height: 200px; }
        .footer { font-size: 10px; text-align: center; color: #999; margin-top: 30px; }
        table { width: 100%; font-size: 11px; border-collapse: collapse; }
        table th, table td { padding: 6px; text-align: left; border-bottom: 1px solid #eee; }
        table th { background: #f5f5f5; font-size: 10px; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Titiktemu.</h1>
        <p>E-Ticket Perjalanan Wisata</p>
    </div>

    <div class="card">
        <div class="row"><span class="label">Kode Booking</span><span class="value"><?php echo e($booking->kode); ?></span></div>
        <div class="row"><span class="label">Kode Trip</span><span class="value"><?php echo e($trip->kode); ?></span></div>
        <div class="row"><span class="label">Paket</span><span class="value"><?php echo e($trip->snapshotNama()); ?></span></div>
        <div class="row"><span class="label">Tanggal Keberangkatan</span><span class="value"><?php echo e($trip->tanggal_mulai->format('d M Y')); ?> - <?php echo e($trip->tanggal_selesai->format('d M Y')); ?></span></div>
        <div class="row"><span class="label">Jumlah Peserta</span><span class="value"><?php echo e($booking->jumlah_peserta); ?> orang</span></div>
        <div class="row"><span class="label">Nama Client</span><span class="value"><?php echo e($booking->client?->name ?? '-'); ?></span></div>

        <div class="qr">
            
            <img src="data:image/png;base64,<?php echo e(base64_encode(file_get_contents($qrPath))); ?>" alt="QR Code">
            <p style="font-size: 10px; color: #666;">Tunjukkan QR ini saat check-in</p>
        </div>

        <?php if($booking->participants && $booking->participants->count()): ?>
            <h3 style="font-size: 13px; margin-top: 20px;">Daftar Peserta</h3>
            <table>
                <thead><tr><th>No</th><th>Nama</th><th>Umur</th><th>No HP</th></tr></thead>
                <tbody>
                    <?php $__currentLoopData = $booking->participants; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $p): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <tr>
                            <td><?php echo e($i + 1); ?></td>
                            <td><?php echo e($p->nama); ?></td>
                            <td><?php echo e($p->umur ?? '-'); ?></td>
                            <td><?php echo e($p->no_hp ?? '-'); ?></td>
                        </tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tbody>
            </table>
        <?php endif; ?>
    </div>

    <div class="footer">
        <p>Terima kasih telah memesan melalui Titiktemu.</p>
        <p>UUID: <?php echo e($uuid); ?></p>
    </div>
</body>
</html><?php /**PATH /home/z-code/project/siperjaka/resources/views/pdf/e-ticket.blade.php ENDPATH**/ ?>
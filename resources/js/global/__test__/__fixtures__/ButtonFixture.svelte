<script lang="ts">
    import Button from '@/global/Button.svelte';

    let {
        variant = 'primary',
        size = 'md',
        type = 'button',
        href = null,
        method = 'get',
        disabled = false,
        loading = false,
        fullWidth = false,
        onclick = undefined,
        label = 'Tombol Saya',
        ...rest
    }: any = $props();
</script>

<Button
    {variant}
    {size}
    {type}
    {href}
    {method}
    {disabled}
    {loading}
    {fullWidth}
    {onclick}
    {...rest}
>
    {label}
</Button>
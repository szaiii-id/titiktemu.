<script>
    import Layout from '@/components/Layout.svelte';
    import Navbar from '@/components/landing/Navbar.svelte';
    import Hero from '@/components/landing/Hero.svelte';
    import TripBundle from '@/components/landing/TripBundle.svelte';
    import VisiMisi from '@/components/landing/VisiMisi.svelte';
    import Contact from '@/components/landing/Contact.svelte';
</script>

<svelte:head>
    <title>Beranda | Titiktemu</title>
</svelte:head>

<Layout>
    <Navbar />
    <Hero />
    <TripBundle />
    <VisiMisi />
    <Contact />
</Layout>
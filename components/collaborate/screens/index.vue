<template lang="pug">
  section.hero-wrap
    .container
      .hero-card
        h1.hero-title {{ $t('home.title') }}
        p.hero-sub {{ $t('home.subtitle') }}
        .pillar-grid
          nuxt-link.pillar.pillar--discover(to="/discover")
            .pillar__icon 🔎
            h3 {{ $t('nav.discover') }}
            p {{ $t('home.discoverDesc') }}
          nuxt-link.pillar.pillar--connections(to="/connecting")
            .pillar__icon 🔗
            h3 {{ $t('nav.connecting') }}
            p {{ $t('home.connectingDesc') }}
          nuxt-link.pillar.pillar--groups(to="/discover?tab=groups")
            .pillar__icon 👥
            h3 {{ $t('home.groups') }}
            p {{ $t('home.groupsDesc') }}
          nuxt-link.pillar.pillar--market(to="/marketplace")
            .pillar__icon 🛒
            h3 {{ $t('nav.marketplace') }}
            p {{ $t('home.marketDesc') }}
          nuxt-link.pillar.pillar--profile(to="/profile")
            .pillar__icon 👤
            h3 {{ $t('nav.profile') }}
            p {{ $t('home.profileDesc') }}
</template>

<script>
export default {
  name: 'IndexPage'
}
</script>

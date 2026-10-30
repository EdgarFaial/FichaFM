<script setup lang="ts">
import bannerImage from '@/assets/images/feiticeiros_maldicoes_banner_1793369707340.jpg';

defineProps<{
  userEmail: string | null;
}>();

const emit = defineEmits<{
  (e: 'navigate', view: 'home' | 'login' | 'dashboard'): void;
}>();
</script>

<template>
  <main class="home-container">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="system-tag">Feiticeiros & Maldições v2.5.2</div>
        <h1 class="hero-title">Criador e Gerenciador de Fichas de RPG</h1>
        <p class="hero-description">
          Construa, personalize e jogue com seus feiticeiros no sistema de Feiticeiros & Maldições.
          Automação de vida, energia amaldiçoada, técnicas inatas, votos vinculativos e rolagens integradas.
        </p>

        <div class="hero-actions">
          <button 
            type="button" 
            class="cta-primary" 
            @click="emit('navigate', userEmail ? 'dashboard' : 'login')"
          >
            {{ userEmail ? 'Acessar Minhas Fichas' : 'Entrar / Criar Conta' }}
          </button>
          <a href="#recursos" class="cta-secondary">
            Ver Recursos
          </a>
        </div>

        <div class="env-notice">
          <span class="notice-icon">ℹ</span>
          <span>Pronto para uso. As variáveis de ambiente do banco de dados podem ser configuradas a qualquer momento.</span>
        </div>
      </div>

      <div class="hero-media">
        <img 
          :src="bannerImage" 
          alt="Feiticeiros e Maldições RPG" 
          class="banner-img"
          referrerpolicy="no-referrer"
        />
      </div>
    </section>

    <!-- Highlights Section -->
    <section id="recursos" class="features-section">
      <div class="section-header">
        <h2 class="section-title">Construído para o Sistema Feiticeiros & Maldições</h2>
        <p class="section-subtitle">
          Inspirado na experiência ágil do CRIS de Ordem Paranormal, adaptado para as mecânicas de Jujutsu.
        </p>
      </div>

      <div class="features-grid">
        <article class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3 class="feature-title">Automação de Vida e Energia</h3>
          <p class="feature-text">
            Cálculo automático de Pontos de Vida (PV), Energia Amaldiçoada (PE), Defesa e limites por nível e atributos.
          </p>
        </article>

        <article class="feature-card">
          <div class="feature-icon">⚔️</div>
          <h3 class="feature-title">Origens & Especializações</h3>
          <p class="feature-text">
            Suporte a todas as origens, trilhas de especialização e o arquétipo Restringido com progressão de habilidades.
          </p>
        </article>

        <article class="feature-card">
          <div class="feature-icon">📜</div>
          <h3 class="feature-title">Técnicas e Votos Vinculativos</h3>
          <p class="feature-text">
            Registre suas técnicas inatas, habilidades herdadas, feitiços e pactos com bônus e restrições automáticas.
          </p>
        </article>

        <article class="feature-card">
          <div class="feature-icon">🎲</div>
          <h3 class="feature-title">Perícias e Rolagens de Dados</h3>
          <p class="feature-text">
            Testes de perícias calculados dinamicamente com suporte a novas perícias e rolagens rápidas de dano e acerto.
          </p>
        </article>
      </div>
    </section>

    <!-- Footer -->
    <footer class="home-footer">
      <p class="footer-copy">Ficha FM · Sistema de RPG Feiticeiros e Maldições v2.5.2</p>
    </footer>
  </main>
</template>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
  width: 100%;
}

/* Hero Section */
.hero-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3.5rem;
  align-items: center;
  margin-bottom: 5rem;
}

.system-tag {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.75rem;
}

.hero-title {
  font-size: clamp(2rem, 3.5vw, 3rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--color-text-main);
  margin-bottom: 1.25rem;
  text-wrap: balance;
}

.hero-description {
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--color-text-muted);
  margin-bottom: 2rem;
  max-width: 540px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.cta-primary {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.cta-primary:hover {
  background-color: var(--color-accent-hover);
}

.cta-secondary {
  background-color: transparent;
  color: var(--color-text-main);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-block;
}

.cta-secondary:hover {
  border-color: var(--color-border-hover);
  background-color: var(--color-bg-surface);
}

.env-notice {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.825rem;
  color: var(--color-text-subtle);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.85rem;
  max-width: 500px;
}

.notice-icon {
  color: var(--color-accent);
  font-weight: bold;
}

/* Media */
.hero-media {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-surface);
  box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.4);
}

.banner-img {
  width: 100%;
  height: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}

/* Features Section */
.features-section {
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
  margin-bottom: 4rem;
}

.section-header {
  margin-bottom: 2.5rem;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-main);
  margin-bottom: 0.5rem;
}

.section-subtitle {
  font-size: 0.95rem;
  color: var(--color-text-muted);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.feature-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.75rem;
  transition: border-color 0.15s ease;
}

.feature-card:hover {
  border-color: var(--color-border-hover);
}

.feature-icon {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}

.feature-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-main);
  margin-bottom: 0.5rem;
}

.feature-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-text-muted);
}

/* Footer */
.home-footer {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

.footer-copy {
  font-size: 0.825rem;
  color: var(--color-text-subtle);
}

@media (max-width: 900px) {
  .hero-section {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
}
</style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits<{
  (e: 'login-success', email: string): void;
  (e: 'navigate', view: 'home' | 'login' | 'dashboard'): void;
}>();

const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const isGoogleLoading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const dbOfflineNotice = ref(false);
const showGoogleConfigModal = ref(false);

const toggleMode = (newMode: 'login' | 'register') => {
  mode.value = newMode;
  errorMessage.value = '';
  successMessage.value = '';
};

// Message listener for Google OAuth popup
const handleOAuthMessage = (event: MessageEvent) => {
  if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
    const { token, email: userEmail } = event.data;
    if (token) {
      localStorage.setItem('ficha_token', token);
      localStorage.setItem('ficha_user_email', userEmail);
      successMessage.value = 'Autenticado com Google com sucesso!';
      setTimeout(() => {
        emit('login-success', userEmail);
      }, 500);
    }
  } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
    errorMessage.value = decodeURIComponent(event.data.error || 'Erro na autenticação com o Google.');
  }
};

onMounted(() => {
  window.addEventListener('message', handleOAuthMessage);
});

onUnmounted(() => {
  window.removeEventListener('message', handleOAuthMessage);
});

const handleSubmit = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor, preencha o e-mail e a senha.';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  dbOfflineNotice.value = false;

  const endpoint = mode.value === 'login' ? '/api/login' : '/api/register';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.token) {
      localStorage.setItem('ficha_token', data.token);
      localStorage.setItem('ficha_user_email', data.email || email.value.trim());
      successMessage.value = mode.value === 'login' ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!';
      setTimeout(() => {
        emit('login-success', data.email || email.value.trim());
      }, 500);
    } else {
      if (response.status === 503 || response.status === 500 || data.message?.includes('MongoDB') || data.message?.includes('buffering')) {
        dbOfflineNotice.value = true;
        errorMessage.value = 'Banco de dados offline ou sem variáveis configuradas.';
      } else {
        errorMessage.value = data.message || 'Falha ao autenticar. Verifique suas credenciais.';
      }
    }
  } catch {
    dbOfflineNotice.value = true;
    errorMessage.value = 'Não foi possível conectar ao servidor de autenticação.';
  } finally {
    isLoading.value = false;
  }
};

const handleGoogleLogin = async () => {
  isGoogleLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const response = await fetch(`/api/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
    const data = await response.json().catch(() => ({}));

    if (data.configured && data.url) {
      const authWindow = window.open(
        data.url,
        'google_oauth_popup',
        'width=550,height=650,scrollbars=yes'
      );

      if (!authWindow) {
        errorMessage.value = 'O popup foi bloqueado pelo navegador. Por favor, permita popups para este site.';
      }
    } else {
      // Google credentials not yet entered in environment variables
      showGoogleConfigModal.value = true;
    }
  } catch {
    showGoogleConfigModal.value = true;
  } finally {
    isGoogleLoading.value = false;
  }
};

const handleGoogleSimulation = async (simulatedEmail: string = 'usuario.google@gmail.com') => {
  try {
    const response = await fetch('/api/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: simulatedEmail, googleId: 'simulated-google-id' })
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('ficha_token', data.token);
      localStorage.setItem('ficha_user_email', data.email);
      showGoogleConfigModal.value = false;
      successMessage.value = 'Login com Google (Modo de Teste) efetuado!';
      setTimeout(() => {
        emit('login-success', data.email);
      }, 400);
    }
  } catch {
    localStorage.setItem('ficha_token', 'google-test-token');
    localStorage.setItem('ficha_user_email', simulatedEmail);
    emit('login-success', simulatedEmail);
  }
};

const handleDemoAccess = () => {
  const demoEmail = email.value.trim() || 'feiticeiro@demonstracao.com';
  localStorage.setItem('ficha_token', 'demo-token-12345');
  localStorage.setItem('ficha_user_email', demoEmail);
  emit('login-success', demoEmail);
};
</script>

<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <div class="card-header">
        <button type="button" class="back-btn" @click="emit('navigate', 'home')">
          ← Voltar ao Início
        </button>
        <div class="auth-crest">✦</div>
        <h2 class="auth-title">
          {{ mode === 'login' ? 'Acessar Conta' : 'Criar Nova Conta' }}
        </h2>
        <p class="auth-subtitle">
          {{ mode === 'login' 
            ? 'Entre para gerenciar e criar suas fichas de Feiticeiros & Maldições' 
            : 'Cadastre-se para salvar suas fichas de RPG' }}
        </p>
      </div>

      <!-- Mode switcher tabs -->
      <div class="mode-tabs">
        <button 
          type="button" 
          class="mode-tab" 
          :class="{ active: mode === 'login' }"
          @click="toggleMode('login')"
        >
          Entrar
        </button>
        <button 
          type="button" 
          class="mode-tab" 
          :class="{ active: mode === 'register' }"
          @click="toggleMode('register')"
        >
          Registrar
        </button>
      </div>

      <!-- Feedback messages -->
      <div v-if="errorMessage" class="alert-box alert-error">
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="alert-box alert-success">
        <span>{{ successMessage }}</span>
      </div>

      <!-- Database offline helper alert -->
      <div v-if="dbOfflineNotice" class="alert-box alert-warning">
        <p class="warning-title">Conexão com Banco de Dados:</p>
        <p class="warning-text">
          As variáveis de ambiente do MongoDB ainda não foram inseridas. Você pode prosseguir no <strong>Modo Demonstração</strong> para navegar e testar a aplicação!
        </p>
        <button type="button" class="demo-btn" @click="handleDemoAccess">
          Entrar no Modo Demonstração
        </button>
      </div>

      <!-- Google Sign In Button -->
      <button 
        type="button" 
        class="google-btn" 
        :disabled="isGoogleLoading"
        @click="handleGoogleLogin"
      >
        <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span v-if="isGoogleLoading">Iniciando Google...</span>
        <span v-else>Continuar com o Google</span>
      </button>

      <div class="auth-divider">
        <span class="divider-line"></span>
        <span class="divider-text">ou com e-mail</span>
        <span class="divider-line"></span>
      </div>

      <!-- Auth Form -->
      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="email" class="form-label">E-mail</label>
          <input 
            id="email"
            v-model="email"
            type="email" 
            placeholder="seuemail@exemplo.com"
            required
            class="form-input"
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Senha</label>
          <div class="input-password-wrapper">
            <input 
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'" 
              placeholder="••••••••"
              required
              class="form-input"
              autocomplete="current-password"
            />
            <button 
              type="button" 
              class="toggle-pwd-btn"
              @click="showPassword = !showPassword"
              :title="showPassword ? 'Ocultar senha' : 'Ver senha'"
            >
              {{ showPassword ? 'Ocultar' : 'Ver' }}
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          class="submit-btn" 
          :disabled="isLoading"
        >
          <span v-if="isLoading">Aguarde...</span>
          <span v-else>{{ mode === 'login' ? 'Entrar no Sistema' : 'Criar Minha Conta' }}</span>
        </button>

        <div class="demo-fallback-row">
          <span class="divider-subtext">ou para testar agora</span>
          <button type="button" class="btn-demo-link" @click="handleDemoAccess">
            Acessar sem login (Modo Demonstração)
          </button>
        </div>
      </form>
    </div>

    <!-- Google Config Helper Modal (active when env vars pending) -->
    <div v-if="showGoogleConfigModal" class="modal-overlay" @click.self="showGoogleConfigModal = false">
      <div class="modal-dialog">
        <div class="modal-dialog-header">
          <h3 class="modal-dialog-title">Login com o Google</h3>
          <button type="button" class="close-btn" @click="showGoogleConfigModal = false">✕</button>
        </div>

        <p class="modal-dialog-text">
          O botão de login com o Google está pronto e implementado! Para a autenticação oficial do Google abrir a janela pop-up, adicione no seu <code>.env</code>:
        </p>
        <ul class="modal-list">
          <li><code>GOOGLE_CLIENT_ID</code></li>
          <li><code>GOOGLE_CLIENT_SECRET</code></li>
        </ul>
        <p class="modal-dialog-text">
          Como você passará as variáveis depois, você pode clicar abaixo para testar o fluxo completo de entrada agora mesmo com uma conta de teste do Google:
        </p>

        <div class="modal-dialog-actions">
          <button 
            type="button" 
            class="btn-google-sim" 
            @click="handleGoogleSimulation('edgarofaialm@gmail.com')"
          >
            Entrar como edgarofaialm@gmail.com
          </button>
          <button 
            type="button" 
            class="btn-close-dialog" 
            @click="showGoogleConfigModal = false"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  width: 100%;
  flex: 1;
}

.auth-card {
  width: 100%;
  max-width: 440px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2.25rem 2rem;
  box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.4);
}

.card-header {
  text-align: center;
  margin-bottom: 1.5rem;
  position: relative;
}

.back-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  margin-bottom: 1rem;
  display: inline-block;
  transition: color 0.15s ease;
}

.back-btn:hover {
  color: var(--color-text-main);
}

.auth-crest {
  color: var(--color-accent);
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-main);
  margin-bottom: 0.4rem;
}

.auth-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.mode-tabs {
  display: flex;
  background-color: var(--color-bg-base);
  border-radius: 8px;
  padding: 3px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
}

.mode-tab {
  flex: 1;
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-tab.active {
  background-color: var(--color-bg-surface-elevated);
  color: var(--color-text-main);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Google Button */
.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  background-color: #ffffff;
  color: #1f2937;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.7rem 1rem;
  font-size: 0.925rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.google-btn:hover:not(:disabled) {
  background-color: #f9fafb;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.google-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.google-icon {
  flex-shrink: 0;
}

/* Auth Divider */
.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background-color: var(--color-border);
}

.divider-text {
  font-size: 0.78rem;
  color: var(--color-text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.alert-box {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.alert-error {
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.alert-success {
  background-color: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}

.alert-warning {
  background-color: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fde68a;
}

.warning-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.warning-text {
  font-size: 0.825rem;
  margin-bottom: 0.75rem;
  color: #fef3c7;
}

.demo-btn {
  background-color: #d97706;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.45rem 0.85rem;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.demo-btn:hover {
  background-color: #b45309;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-main);
}

.form-input {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.65rem 0.85rem;
  color: var(--color-text-main);
  font-size: 0.925rem;
  outline: none;
  transition: border-color 0.15s ease;
  width: 100%;
}

.form-input:focus {
  border-color: var(--color-accent);
}

.input-password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.toggle-pwd-btn {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: var(--color-text-subtle);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}

.toggle-pwd-btn:hover {
  color: var(--color-text-muted);
}

.submit-btn {
  background-color: var(--color-accent);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.925rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
  margin-top: 0.25rem;
}

.submit-btn:hover:not(:disabled) {
  background-color: var(--color-accent-hover);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.demo-fallback-row {
  margin-top: 0.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.divider-subtext {
  font-size: 0.75rem;
  color: var(--color-text-subtle);
}

.btn-demo-link {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.825rem;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.15s ease;
}

.btn-demo-link:hover {
  color: var(--color-text-main);
}

/* Modal helper */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal-dialog {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.75rem;
  width: 100%;
  max-width: 440px;
}

.modal-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.modal-dialog-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.1rem;
  cursor: pointer;
}

.modal-dialog-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.modal-dialog-text code {
  color: #38bdf8;
  background-color: var(--color-bg-base);
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.825rem;
}

.modal-list {
  margin: 0.5rem 0 1rem 1.25rem;
  font-size: 0.85rem;
  color: #38bdf8;
}

.modal-dialog-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1.25rem;
}

.btn-google-sim {
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 0.65rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-google-sim:hover {
  background-color: #1d4ed8;
}

.btn-close-dialog {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
}
</style>

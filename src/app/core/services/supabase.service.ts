import { Injectable, computed, signal } from '@angular/core';
import {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
  createClient,
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private readonly supabase: SupabaseClient;

  // Sinais de estado reativo para sessão e usuário
  readonly currentUser = signal<User | null>(null);
  readonly currentSession = signal<Session | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal<boolean>(true);
  readonly planType = signal<'PRO' | 'DEMO' | null>(null);
  readonly isDemoAccount = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    return user.email === 'teste@teste.com' || this.planType() === 'DEMO';
  });

  constructor() {
    // Sanitiza a URL removendo sufixos acidentais como /rest/v1/ ou barras finais
    const sanitizedUrl = environment.supabase.url
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');

    this.supabase = createClient(
      sanitizedUrl,
      environment.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );

    this.initAuth();
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  private async initAuth(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (!error && data.session) {
        this.currentSession.set(data.session);
        this.currentUser.set(data.session.user);
        this.loadUserProfile(data.session.user?.id);
      }
    } finally {
      this.isLoading.set(false);
    }

    // Ouvinte reativo para login, logout e renovação de token
    this.supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        this.currentSession.set(session);
        this.currentUser.set(session?.user ?? null);
        if (session?.user) {
          this.loadUserProfile(session.user.id);
        } else {
          this.planType.set(null);
        }
        if (event === 'SIGNED_OUT') {
          await this.clearAppCaches();
        }
      }
    );
  }

  /**
   * Consulta o tipo de plano do usuário na tabela user_profiles
   */
  private async loadUserProfile(userId?: string): Promise<void> {
    if (!userId) {
      this.planType.set(null);
      return;
    }
    const user = this.currentUser();
    if (user?.email === 'teste@teste.com') {
      this.planType.set('DEMO');
    }
    try {
      const { data } = await this.supabase
        .from('user_profiles')
        .select('plan_type')
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.plan_type) {
        this.planType.set(data.plan_type as 'PRO' | 'DEMO');
      }
    } catch {
      // Ignora erro e mantém salvaguarda
    }
  }

  /**
   * Limpa todo o CacheStorage do Service Worker no navegador para expurgar dados
   */
  private async clearAppCaches(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
    } catch (err) {
      console.warn('Erro ao limpar CacheStorage:', err);
    }
  }

  /**
   * Autenticação nativa por E-mail e Senha
   */
  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }

  /**
   * Cadastro de nova conta por E-mail e Senha
   */
  async signUp(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
  }

  /**
   * Autenticação sem senha via link no e-mail (Magic Link)
   */
  async signInWithOtp(email: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/hub`,
      },
    });

    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.clearAppCaches();
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    this.currentSession.set(null);
    this.currentUser.set(null);
  }

  /**
   * Obtém o token JWT da sessão ativa para chamadas seguras autenticadas.
   * Executa getSession() para renovar automaticamente o token via refresh_token caso esteja expirado.
   */
  async getAccessToken(): Promise<string | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error || !data.session) {
      return null;
    }
    this.currentSession.set(data.session);
    this.currentUser.set(data.session.user);
    return data.session.access_token;
  }
}

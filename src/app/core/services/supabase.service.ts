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

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
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
      }
    } finally {
      this.isLoading.set(false);
    }

    // Ouvinte em tempo real para mudanças de login/logout/token refresh
    this.supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        this.currentSession.set(session);
        this.currentUser.set(session?.user ?? null);
      }
    );
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/hub`,
      },
    });

    if (error) {
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw error;
    }
    this.currentSession.set(null);
    this.currentUser.set(null);
  }
}

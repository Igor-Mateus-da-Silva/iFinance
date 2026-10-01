import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Se o serviço ainda está verificando a sessão no Supabase, aguarda a resolução
  if (supabase.isLoading()) {
    const { data } = await supabase.client.auth.getSession();
    if (data.session) {
      return true;
    }
  }

  if (supabase.isAuthenticated()) {
    return true;
  }

  // Não autenticado -> redireciona para a tela de login
  return router.createUrlTree(['/login']);
};

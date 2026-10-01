import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';
import { AiChatComponent } from '../../features/financial/components/ai-chat.component';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AiChatComponent],
  template: `
    <div class="min-h-screen bg-gray-50/60 text-gray-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <!-- 1. Top Navbar Executiva -->
      <header class="h-16 bg-white/95 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        <div class="flex items-center gap-3 sm:gap-4">
          <!-- Botão Toggle Mobile Sidebar (Drawer) -->
          <button
            type="button"
            (click)="toggleSidebar()"
            class="md:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menu">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <!-- Logo Brand -->
          <div (click)="goToHub()" class="flex items-center gap-2.5 cursor-pointer group">
            <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-sm shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div class="hidden sm:block">
              <span class="text-base font-bold text-gray-900 tracking-tight leading-none">iFinance <span class="text-blue-600">Capital</span></span>
            </div>
          </div>

          <div class="h-5 w-px bg-gray-200 hidden sm:block"></div>

          <!-- Indicador do Módulo Ativo -->
          <div class="flex items-center gap-2">
            <span
              class="px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 bg-blue-50 text-blue-700 border-blue-200/60">
              <span class="w-2 h-2 rounded-full bg-blue-600"></span>
              {{ moduleTitle() }}
            </span>

            <button
              type="button"
              (click)="goToHub()"
              class="text-xs text-gray-500 hover:text-blue-600 underline decoration-gray-300 hover:decoration-blue-400 transition-colors ml-1 hidden sm:inline-block">
              Trocar Módulo
            </button>
          </div>
        </div>

        <!-- Ações do Usuário e Logout -->
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="hidden md:flex flex-col text-right">
            <span class="text-xs font-semibold text-gray-800">{{ userEmail() }}</span>
            <span class="text-[10px] text-gray-500">Investidor Autenticado</span>
          </div>

          <div class="w-8 h-8 rounded-full bg-blue-50 border border-blue-200/80 flex items-center justify-center text-xs font-bold text-blue-700">
            {{ userInitial() }}
          </div>

          <button
            type="button"
            (click)="logout()"
            title="Sair da Conta"
            class="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label="Sair da conta">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Corpo Principal: Sidebar + Conteúdo -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Backdrop Mobile -->
        @if (sidebarOpen()) {
          <div
            (click)="toggleSidebar()"
            class="fixed inset-0 bg-gray-950/30 backdrop-blur-xs z-30 md:hidden transition-opacity"></div>
        }

        <!-- 2. Sidebar Lateral Desktop / Mobile Drawer -->
        <aside
          [class.translate-x-0]="sidebarOpen()"
          [class.-translate-x-full]="!sidebarOpen()"
          class="fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200/80 p-4 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 shadow-sm md:shadow-none">
          
          <div>
            <!-- Título do Menu da Seção -->
            <div class="px-3 mb-4">
              <span class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Navegação {{ isInvestments() ? 'de Investimentos' : 'Financeira' }}
              </span>
            </div>

            <!-- Links de Navegação -->
            <nav class="space-y-1">
              @for (item of currentNavItems(); track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="bg-blue-50 text-blue-700 font-semibold border-blue-200/80 shadow-2xs"
                  [routerLinkActiveOptions]="{ exact: false }"
                  (click)="closeSidebarOnMobile()"
                  class="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent transition-all group">
                  <div class="flex items-center gap-3">
                    <span class="text-gray-400 group-hover:text-blue-600 transition-colors" [innerHTML]="item.icon"></span>
                    <span>{{ item.label }}</span>
                  </div>
                  @if (item.badge) {
                    <span class="px-2 py-0.5 text-[10px] rounded-full font-bold bg-blue-100/70 text-blue-700 border border-blue-200/60">
                      {{ item.badge }}
                    </span>
                  }
                </a>
              }
            </nav>
          </div>

          <!-- Rodapé da Sidebar: Acesso Rápido ao Hub -->
          <div class="pt-4 border-t border-gray-200/80 space-y-2">
            <button
              type="button"
              (click)="goToHub()"
              class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 transition-all">
              <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Central (Hub)</span>
            </button>
          </div>
        </aside>

        <!-- 3. Área de Conteúdo da Página -->
        <main class="flex-1 overflow-y-auto bg-gray-50/60 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div class="max-w-7xl mx-auto">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <!-- 4. Bottom Navigation Bar para Mobile (PWA Touch Experience) -->
      <nav
        class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg shadow-gray-200/50"
        aria-label="Navegação móvel">
        @for (item of currentNavItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="text-blue-600 font-bold"
            [routerLinkActiveOptions]="{ exact: false }"
            class="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-gray-500 hover:text-blue-600 transition-colors">
            <span class="w-5 h-5 flex items-center justify-center" [innerHTML]="item.icon"></span>
            <span class="text-[10px] mt-0.5 tracking-tight truncate max-w-[70px]">{{ item.label.split(' ')[0] }}</span>
          </a>
        }
        <button
          type="button"
          (click)="goToHub()"
          class="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 px-2 rounded-xl text-gray-500 hover:text-blue-600 transition-colors"
          aria-label="Ir para a Central Hub">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="text-[10px] mt-0.5 tracking-tight">Hub</span>
        </button>
      </nav>

      <!-- 5. Assistente de IA Gemini (visível nas telas da área financeira) -->
      @if (!isInvestments()) {
        <app-ai-chat></app-ai-chat>
      }
    </div>
  `,
})
export class AppLayoutComponent {
  private readonly router = inject(Router);
  readonly supabase = inject(SupabaseService);

  sidebarOpen = signal<boolean>(false);
  currentUrl = signal<string>(this.router.url);

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      });
  }

  isInvestments = computed(() => {
    return this.currentUrl().startsWith('/investments');
  });

  moduleTitle = computed(() => {
    return this.isInvestments() ? 'Controle de Investimentos' : 'Controle Financeiro';
  });

  userEmail = computed(() => {
    return this.supabase.currentUser()?.email ?? 'Usuário';
  });

  userInitial = computed(() => {
    const email = this.userEmail();
    return email ? email.charAt(0).toUpperCase() : 'U';
  });

  // Itens dinâmicos dependendo do módulo ativo
  currentNavItems = computed<NavItem[]>(() => {
    if (this.isInvestments()) {
      return [
        {
          label: 'Estratégia de Metas',
          path: '/investments/strategy',
          icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>`,
        },
        {
          label: 'Carteira & Cotações',
          path: '/investments/portfolio',
          icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>`,
        },
        {
          label: 'Aportes Inteligentes',
          path: '/investments/aportes',
          icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>`,
          badge: 'Engine',
        },
      ];
    } else {
      return [
        {
          label: 'Dashboard Financeiro',
          path: '/financial/dashboard',
          icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
        },
        {
          label: 'Lançamentos & Faturas',
          path: '/financial/transactions',
          icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
          badge: 'Diário',
        },
        {
          label: 'Configurações (Setup)',
          path: '/financial/setup',
          icon: `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
          badge: '50/30/20',
        },
      ];
    }
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth < 768) {
      this.sidebarOpen.set(false);
    }
  }

  goToHub(): void {
    this.router.navigate(['/hub']);
  }

  async logout(): Promise<void> {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { AiChatComponent } from './ai-chat.component';
import { AiAssistantService } from '../services/ai-assistant.service';
import { TransactionService } from '../services/transaction.service';
import { FinanceSetupService } from '../services/finance-setup.service';
import { PortfolioService } from '../../investments/services/portfolio.service';
import { AssetClassesService } from '../../investments/services/asset-classes.service';

describe('AiChatComponent', () => {
  let component: AiChatComponent;
  let fixture: ComponentFixture<AiChatComponent>;
  let mockAiService: any;
  let mockTxService: any;
  let mockSetupService: any;
  let mockPortfolioService: any;
  let mockAssetClassesService: any;

  beforeEach(async () => {
    mockAiService = {
      isInvestmentsRoute: vi.fn().mockReturnValue(false),
      isModalRequested: signal(false),
      isAssetModalRequested: signal(false),
      modalPrefill: signal(null),
      assetPrefill: signal(null),
      clearModalRequest: vi.fn(),
      clearAssetModalRequest: vi.fn(),
      sendMessageStream: vi.fn().mockReturnValue(of('Resposta', ' em', ' streaming')),
      extractReceiptData: vi.fn().mockResolvedValue({
        amount: 54.3,
        date: '2026-10-01',
        description: 'Padaria Estrela',
        suggested_category_type: 'EXPENSE',
        suggested_category_name: 'Alimentação',
      }),
      extractInvestmentData: vi.fn().mockResolvedValue({
        ticker: 'PETR4',
        quantity: 100,
        price: 38.5,
        date: '2026-10-01',
        total: 3850.0,
      }),
    };

    mockTxService = {
      createTransaction: vi.fn().mockResolvedValue([{ id: 'tx-1' }]),
    };

    mockSetupService = {
      getAccounts: vi.fn().mockResolvedValue([{ id: 'acc-1', name: 'Nubank', balance: 1000 }]),
      getCreditCards: vi.fn().mockResolvedValue([{ id: 'card-1', name: 'Mastercard' }]),
      getCategories: vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'Alimentação', type: 'EXPENSE' }]),
    };

    mockPortfolioService = {
      createAssetWithHolding: vi.fn().mockResolvedValue(undefined),
    };

    mockAssetClassesService = {
      getClasses: vi.fn().mockResolvedValue([
        { id: 'cls-1', name: 'Ações Brasileiras', target_percentage: 40, parent_id: null },
        { id: 'cls-2', name: 'Fundos Imobiliários (FIIs)', target_percentage: 30, parent_id: null },
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [AiChatComponent],
      providers: [
        { provide: AiAssistantService, useValue: mockAiService },
        { provide: TransactionService, useValue: mockTxService },
        { provide: FinanceSetupService, useValue: mockSetupService },
        { provide: PortfolioService, useValue: mockPortfolioService },
        { provide: AssetClassesService, useValue: mockAssetClassesService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AiChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve inicializar com o drawer fechado e carregar dados auxiliares', () => {
    expect(component.isOpen()).toBe(false);
    expect(component.messages().length).toBeGreaterThanOrEqual(1);
    expect(mockSetupService.getAccounts).toHaveBeenCalled();
    expect(mockAssetClassesService.getClasses).toHaveBeenCalled();
  });

  it('deve alternar a abertura do drawer (toggleChat)', () => {
    component.toggleChat();
    expect(component.isOpen()).toBe(true);

    component.closeChat();
    expect(component.isOpen()).toBe(false);
  });

  it('deve enviar mensagem de texto e atualizar o streaming', () => {
    component.userInput = 'Posso comprar um café?';
    component.handleSendMessage();

    expect(mockAiService.sendMessageStream).toHaveBeenCalled();
    const lastMsg = component.messages()[component.messages().length - 1];
    expect(lastMsg.text).toContain('Resposta em streaming');
    expect(component.isStreaming()).toBe(false);
  });

  it('deve abrir o modal financeiro com dados pré-preenchidos a partir de um comprovante lido', () => {
    component.openModalFromReceipt({
      amount: 120.5,
      date: '2026-10-01',
      description: 'Supermercado Central',
      suggested_category_type: 'EXPENSE',
      suggested_category_name: 'Alimentação',
    });

    expect(component.showTransactionModal()).toBe(true);
    expect(component.modalForm.amount).toBe(120.5);
    expect(component.modalForm.description).toBe('Supermercado Central');
    expect(component.modalForm.category_id).toBe('cat-1');
  });

  it('deve abrir o modal de investimentos com dados pré-preenchidos a partir de uma nota de corretagem lida', () => {
    component.openModalFromInvestment({
      ticker: 'PETR4',
      quantity: 50,
      price: 36.2,
      date: '2026-10-02',
      total: 1810.0,
    });

    expect(component.showAssetModal()).toBe(true);
    expect(component.assetModalForm.ticker).toBe('PETR4');
    expect(component.assetModalForm.quantity).toBe(50);
    expect(component.assetModalForm.current_price).toBe(36.2);
    expect(component.assetModalForm.asset_class_id).toBe('cls-1'); // Auto-identificou Ações
  });

  it('deve salvar o ativo no módulo de investimentos e fechar o modal', async () => {
    component.assetModalForm = {
      ticker: 'MXRF11',
      asset_class_id: 'cls-2',
      current_price: 10.5,
      quantity: 100,
      date: '2026-10-02',
    };
    component.showAssetModal.set(true);

    await component.handleSaveAssetFromModal();

    expect(mockPortfolioService.createAssetWithHolding).toHaveBeenCalledWith({
      ticker: 'MXRF11',
      asset_class_id: 'cls-2',
      current_price: 10.5,
      quantity: 100,
      average_price: 10.5,
    });
    expect(component.showAssetModal()).toBe(false);
    const lastMsg = component.messages()[component.messages().length - 1];
    expect(lastMsg.text).toContain('Ativo adicionado à sua carteira');
  });

  it('deve salvar o lançamento financeiro e fechar o modal', async () => {
    component.modalForm = {
      type: 'EXPENSE',
      amount: 45.0,
      description: 'Farmácia',
      date: '2026-10-01',
      category_id: 'cat-1',
      payment_method: 'PIX',
      credit_card_id: null,
      account_id: 'acc-1',
    };
    component.showTransactionModal.set(true);

    await component.handleSaveFromModal();

    expect(mockTxService.createTransaction).toHaveBeenCalled();
    expect(component.showTransactionModal()).toBe(false);
    const lastMsg = component.messages()[component.messages().length - 1];
    expect(lastMsg.text).toContain('Lançamento salvo com sucesso');
  });

  it('deve gerenciar o ciclo de vida do modal de câmera e fechamento', async () => {
    expect(component.showCameraModal()).toBe(false);

    await component.openCamera();
    expect(component.showCameraModal()).toBe(true);

    component.closeCamera();
    expect(component.showCameraModal()).toBe(false);
  });

  it('deve rejeitar arquivos com formato inválido (anti-DoS)', async () => {
    const fakeTextFile = new File(['conteudo texto'], 'documento.txt', { type: 'text/plain' });

    await component.processReceiptFile(fakeTextFile);

    const lastMsg = component.messages()[component.messages().length - 1];
    expect(lastMsg.text).toContain('Formato inválido');
    expect(mockAiService.extractReceiptData).not.toHaveBeenCalled();
    expect(mockAiService.extractInvestmentData).not.toHaveBeenCalled();
  });

  it('deve rejeitar imagens com tamanho excessivo acima de 10 MB (anti-DoS)', async () => {
    const largeFile = new File(['x'], 'foto-gigante.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 12 * 1024 * 1024 });

    await component.processReceiptFile(largeFile);

    const lastMsg = component.messages()[component.messages().length - 1];
    expect(lastMsg.text).toContain('Arquivo muito grande');
    expect(mockAiService.extractReceiptData).not.toHaveBeenCalled();
  });
});

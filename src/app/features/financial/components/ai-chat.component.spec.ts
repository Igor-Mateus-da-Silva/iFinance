import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AiChatComponent } from './ai-chat.component';
import { AiAssistantService } from '../services/ai-assistant.service';
import { TransactionService } from '../services/transaction.service';
import { FinanceSetupService } from '../services/finance-setup.service';

describe('AiChatComponent', () => {
  let component: AiChatComponent;
  let fixture: ComponentFixture<AiChatComponent>;
  let mockAiService: any;
  let mockTxService: any;
  let mockSetupService: any;

  beforeEach(async () => {
    mockAiService = {
      sendMessageStream: vi.fn().mockReturnValue(of('Resposta', ' em', ' streaming')),
      extractReceiptData: vi.fn().mockResolvedValue({
        amount: 54.3,
        date: '2026-10-01',
        description: 'Padaria Estrela',
        suggested_category_type: 'EXPENSE',
        suggested_category_name: 'Alimentação',
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

    await TestBed.configureTestingModule({
      imports: [AiChatComponent],
      providers: [
        { provide: AiAssistantService, useValue: mockAiService },
        { provide: TransactionService, useValue: mockTxService },
        { provide: FinanceSetupService, useValue: mockSetupService },
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

  it('deve abrir o modal com dados pré-preenchidos a partir de um comprovante lido', () => {
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

  it('deve salvar o lançamento e fechar o modal', async () => {
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
  });

  it('deve rejeitar imagens com tamanho excessivo acima de 10 MB (anti-DoS)', async () => {
    // Simula arquivo de 12 MB
    const largeFile = new File(['x'], 'foto-gigante.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 12 * 1024 * 1024 });

    await component.processReceiptFile(largeFile);

    const lastMsg = component.messages()[component.messages().length - 1];
    expect(lastMsg.text).toContain('Arquivo muito grande');
    expect(mockAiService.extractReceiptData).not.toHaveBeenCalled();
  });
});



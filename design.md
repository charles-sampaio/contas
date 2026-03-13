# Design — Contas & Boletos

## Brand

- **App Name:** Contas & Boletos
- **Tagline:** Controle suas contas com facilidade
- **Primary Color:** `#1E6FD9` (azul confiança)
- **Accent Color:** `#22C55E` (verde pago)
- **Warning Color:** `#F59E0B` (amarelo vencendo)
- **Error Color:** `#EF4444` (vermelho vencido)
- **Background:** `#F0F4FF` (light) / `#0F1623` (dark)
- **Surface:** `#FFFFFF` (light) / `#1A2235` (dark)

## Screen List

1. **Home (Resumo Mensal)** — Visão geral do mês atual
2. **Lista de Contas** — Todas as contas do mês selecionado
3. **Adicionar Conta** — Formulário para nova conta/boleto
4. **Editar Conta** — Formulário de edição de conta existente
5. **Detalhes da Conta** — Detalhes completos de uma conta
6. **Histórico** — Contas pagas e histórico por mês
7. **Configurações** — Preferências de notificação

## Primary Content and Functionality

### Home (Resumo Mensal)
- Cabeçalho com mês/ano atual e navegação entre meses (← →)
- Cards de resumo: Total a pagar, Total pago, Saldo restante
- Barra de progresso de pagamentos do mês
- Lista rápida das próximas contas a vencer (próximos 7 dias)
- Botão FAB (+) para adicionar nova conta

### Lista de Contas
- Filtros: Todas / Pendentes / Pagas / Vencidas
- Cards de conta com: nome, valor, vencimento, status (badge colorido)
- Swipe para marcar como pago / deletar
- Seleção múltipla para ações em lote (marcar todas como pagas, deletar)
- Ordenação por: vencimento, valor, nome

### Adicionar / Editar Conta
- Campo: Nome da conta (texto)
- Campo: Valor (numérico com máscara R$)
- Campo: Data de vencimento (date picker)
- Campo: Categoria (Moradia, Transporte, Saúde, Educação, Alimentação, Lazer, Outros)
- Campo: Recorrência (Única, Mensal, Anual)
- Toggle: Notificação (1 dia antes, 3 dias antes, 7 dias antes)
- Toggle: Conta paga
- Botão Salvar / Cancelar

### Detalhes da Conta
- Todas as informações da conta
- Histórico de pagamentos (se recorrente)
- Botões: Editar, Marcar como Pago, Deletar

### Histórico
- Agrupado por mês
- Totais pagos por mês
- Filtro por categoria

### Configurações
- Notificações: ativar/desativar
- Horário padrão de notificação
- Tema (claro/escuro/sistema)

## Key User Flows

### Adicionar uma conta
1. Home → FAB (+) → Formulário de Adicionar
2. Preenche nome, valor, vencimento, categoria
3. Configura recorrência e notificação
4. Toca "Salvar" → volta para Home com nova conta na lista

### Marcar como pago
1. Lista de Contas → Swipe left na conta → "Pago"
2. OU: Toca na conta → Detalhes → "Marcar como Pago"
3. Badge muda para verde "Pago", soma é atualizada no resumo

### Editar uma conta
1. Lista de Contas → Toca na conta → Detalhes → "Editar"
2. OU: Swipe right → "Editar"
3. Formulário pré-preenchido → altera campos → "Salvar"

### Ver histórico
1. Tab "Histórico" → lista de meses passados
2. Toca no mês → ver contas pagas naquele mês

## Color Choices

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| primary | #1E6FD9 | #4A9EFF | Botões, destaques |
| background | #F0F4FF | #0F1623 | Fundo das telas |
| surface | #FFFFFF | #1A2235 | Cards |
| foreground | #0F172A | #F1F5F9 | Texto principal |
| muted | #64748B | #94A3B8 | Texto secundário |
| success | #22C55E | #4ADE80 | Pago |
| warning | #F59E0B | #FBBF24 | Vencendo em breve |
| error | #EF4444 | #F87171 | Vencido |
| border | #E2E8F0 | #1E3A5F | Bordas |

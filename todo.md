# Contas & Boletos — TODO

## Setup & Branding
- [x] Gerar logo do app
- [x] Atualizar theme.config.js com cores do app
- [x] Atualizar app.config.ts com nome e logo
- [x] Criar estrutura de dados (tipos TypeScript)
- [x] Criar contexto de gerenciamento de contas (BillsContext)
- [x] Persistência com AsyncStorage

## Navegação
- [x] Configurar tabs: Home, Contas, Histórico, Configurações
- [x] Adicionar ícones nas tabs
- [x] Criar stack navigator para telas de detalhe/edição

## Tela Home (Resumo Mensal)
- [x] Cabeçalho com navegação de mês (← Mês/Ano →)
- [x] Cards de resumo: Total a pagar, Total pago, Saldo
- [x] Barra de progresso de pagamentos
- [x] Lista de contas próximas do vencimento
- [x] Botão FAB para adicionar conta

## Tela Lista de Contas
- [x] Lista completa de contas do mês
- [x] Filtros: Todas / Pendentes / Pagas / Vencidas
- [x] Ações inline: marcar pago, editar, excluir
- [x] Seleção múltipla para ações em lote
- [x] Ordenação por vencimento/valor/nome

## Formulário Adicionar/Editar Conta
- [x] Campo nome da conta
- [x] Campo valor com máscara R$
- [x] Campo data de vencimento
- [x] Campo categoria com seletor
- [x] Campo recorrência (Única, Mensal, Anual)
- [x] Toggle notificação com opções de antecedência
- [x] Toggle conta paga
- [x] Validação de campos obrigatórios
- [x] Salvar e cancelar

## Tela Histórico
- [x] Lista de meses passados com totais
- [x] Expandir mês para ver contas do mês
- [x] Progresso por mês

## Tela Configurações
- [x] Toggle notificações globais
- [x] Horário padrão de notificação
- [x] Seletor de tema (claro/escuro/sistema)
- [x] Resumo geral de contas
- [x] Apagar todos os dados

## Notificações
- [x] Solicitar permissão de notificação
- [x] Agendar notificação ao criar/editar conta
- [x] Cancelar notificação ao marcar conta como paga
- [x] Cancelar notificação ao deletar conta
- [x] Canal de notificação Android

## Contas Recorrentes
- [x] Utilitário para gerar contas recorrentes
- [x] Indicar visualmente contas recorrentes (ícone repeat)

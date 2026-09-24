# MEMÓRIA & CONTEXTO COMPLETO DO PROJETO - SKY GESTÃO DE CAMPO

> **Atenção Antigravity / IA:** Este arquivo contém todo o histórico de decisões, arquitetura e regras de negócio desenvolvidas neste projeto. Ao abrir este projeto em qualquer máquina nova, utilize este documento como fonte da verdade.

---

## 1. Visão Geral do Sistema
O **SKY Gestão** é um aplicativo PWA (Progressive Web App) desenvolvido em **React 19 + Vite + Tailwind CSS 4**, voltado para **Supervisores de Campo da Rede Credenciada SKY Brasil**.
O sistema é **100% Offline-First e Seguro** (todos os dados ficam gravados localmente no navegador do usuário).

* **Repositório GitHub:** `https://github.com/scavalcantimonteiro-DAISMA/sky-gestao`
* **Deploy Produção (Vercel):** `https://sky-brasil-swart.vercel.app`
* **Deploy Automático:** Qualquer commit na branch `main` gera deploy automático na Vercel em ~30s.

---

## 2. Principais Módulos & Funcionalidades

### A) Checklist de Visita & ATA de Reunião (`src/components/checklist/`)
* **Fluxo em 5 Passos (Stepper):**
  1. **Credenciado:** Identificação da visita (Nome, Cidade, Data, Supervisor) e **Formato de Execução**:
     - *Líderes por Setor (Tradicional):* Para credenciados com líderes separados em cada setor.
     - *Proprietário Centralizado (Gestão Única):* Para credenciados onde o proprietário acumula e resolve tudo sozinho. Passa por todos os setores de forma alinhada diretamente com ele, exibindo banners contextuais e reaproveitando dados para não redigitar nada.
  2. **Torre de Controle:** O.S.s AT e PP em caixa, O.S.s vencidas, técnicos em campo, fotos e pendências.
  3. **Estoque:** Material para a semana, organização, retiradas do dia, fotos e pendências.
  4. **Vendas:** Vendas de Pós, Novos Produtos (NP), Recarga, Chip, Seguro, Permanência e pendências.
  5. **Proprietário & Serviços:** Alinhamento gerencial (T.A AT, T.A PP, Retiradas, Reabertura AT/PP), resumo da conversa, foto e assinatura digital em tela touch/mouse (`SignaturePad.jsx`).
* **Resumo da ATA (`AtaSummaryModal.jsx`):**
  - Geração de PDF profissional com logo SKY (`pdfGenerator.js` via jsPDF);
  - Envio direto para o Outlook formatado (`outlookService.js`);
  - Envio instantâneo formatado para WhatsApp (`openWhatsAppAta`);
  - Criação automática de pendências no banco para o quadro de gestão.

### B) Gestão do Dia & Pendências (`src/components/gestao/`)
* **Edição Completa de Pendências:**
  - Botão de lápis para editar descrição, credenciado, setor, prioridade e lembrete.
* **Sistema de Lembretes / Alarmes Programados:**
  - Botões rápidos: `+4 Horas`, `Amanhã 09:00`, `Daqui a 2 Dias`.
  - Seletor de data e hora do calendário (`datetime-local`).
  - Alarme sonoro em tela e agendamento nativo via push ntfy.sh.
* **Indicador de "Dias na Tela":**
  - Conta quantos dias a pendência está aberta.
  - A partir de 6 dias, marca como **Crítico (vermelho pulsante)** para cobrar resolução urgente.
* **Rotinas Diárias (`RotinasDiarias.jsx`):**
  - Tarefas diárias de supervisão (Seg a Sex).
  - Alerta sonoro e visual disparado **20 minutos antes** de cada rotina com janela de tolerância de minutos e cálculo de fuso horário local brasileiro.
  - Exportação individual para o Calendário do Outlook / Google via arquivo `.ics`.

### C) Notificações Push Celular com Tela Apagada (`src/services/ntfyService.js`)
* Integração 100% gratuita via **ntfy.sh** (sem necessidade de backend, cartão ou cadastro).
* Suporta múltiplos apps no mesmo celular (basta cadastrar tópicos separados no app ntfy).
* Envia payloads em **JSON** (`application/json`) para garantir compatibilidade com emojis (`⏰`, `🔔`, `🚀`) e acentos da língua portuguesa.
* Suporta agendamento de notificações (`delay: "4h"`, `"2d"`).

### D) Banco de Dados Local & Backups (`src/db/` e `src/services/backupService.js`)
* **Dexie / IndexedDB (`SkyGestaoDB` - v1):**
  - Tabelas: `atas`, `pendencias`, `rotinas`.
  - Migrações são 100% não-destrutivas (dados preservados nas atualizações do site).
* **Backup & Exportação:**
  - Exportar/Importar Backup completo em arquivo `.json`.
  - Exportar relatório de Atas para Excel (CSV UTF-8 com separador `;`).
  - Exportar relatório de Pendências para Excel com tempo de tela.

---

## 3. Como Rodar o Projeto em uma Nova Máquina

1. Ter o **Node.js (versão 18+)** e **Git** instalados.
2. Na pasta do projeto, executar:
   ```bash
   npm install
   npm run dev
   ```
3. O servidor Vite iniciará em `http://localhost:5173`.
4. Para compilar e validar o build:
   ```bash
   npm run build
   ```
5. Para enviar atualizações ao GitHub e Vercel:
   ```bash
   git add .
   git commit -m "suas alterações"
   git push origin main
   ```
   *(Ou dar 2 cliques no script `ENVIAR_PARA_GITHUB.bat` na Área de Trabalho)*.

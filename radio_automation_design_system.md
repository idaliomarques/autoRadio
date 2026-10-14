# Design System: AutoRádio Pro

Um guia de estilo visual e de interface projetado para oferecer uma experiência moderna, elegante e altamente funcional para operadores de rádio, locutores e administradores de emissoras.

---

## 1. Filosofia de Design e Princípios

* **Clareza em Alta Pressão:** Ambientes de rádio ao vivo exigem leitura imediata. Informações críticas (tempo restante, música no ar, status de satélite) devem se destacar instantaneamente.
* **Modo Escuro Nativo (Dark Theme):** O padrão visual é escuro para reduzir a fadiga visual em estúdios com pouca luz e garantir alto contraste para telas OLED/LED.
* **Ergonomia Tátil e Visual:** Botões grandes, áreas de clique generosas e feedback visual imediato para evitar erros operacionais em momentos de *on-air*.

---

## 2. Paleta de Cores

A paleta combina tons escuros de fundo com cores vibrantes e funcionais inspiradas em equipamentos de estúdio de alta tecnologia.

| Nome da Cor | Hex Code | Uso Principal |
| :--- | :--- | :--- |
| **Obsidian Dark** (Fundo Principal) | `#0F172A` | Fundo geral da aplicação e painéis |
| **Surface Slate** (Superfície/Cards) | `#1E293B` | Cards, blocos de playlist e seções |
| **Studio Neon Blue** (Primária) | `#3B82F6` | Botões de ação principal, links e seleções |
| **On-Air Emerald** (Sucesso/Ativo) | `#10B981` | Indicadores de "No Ar" (Live), status OK |
| **Warning Amber** (Alerta) | `#F59E0B` | Avisos de transição, relógios, modo manual |
| **Alert Crimson** (Erro/Perigo) | `#EF4444` | Botão de Pânico/Emergency, falhas de conexão |
| **Pure White** (Texto Principal) | `#F8FAFC` | Títulos e textos de alta prioridade |
| **Muted Gray** (Texto Secundário) | `#94A3B8` | Subtítulos, rótulos e metadados menos urgentes |

---

## 3. Tipografia

Utilizamos a fonte **Inter** ou **JetBrains Mono** (para cronômetros e contadores numéricos) garantindo legibilidade geométrica perfeita.

* **Display / Título Principal (H1):** 28px / Bold (Peso 700) — Usado para o nome do software ou telas principais.
* **Subtítulo / Seção (H2):** 20px / SemiBold (Peso 600) — Usado para títulos de blocos e painéis.
* **Texto Padrão (Body):** 14px / Regular (Peso 400) — Listas de músicas, nomes de arquivos e logs.
* **Cronômetro / Tempo (Timer):** 36px / Mono Bold (Peso 700) — Contadores regressivos de áudio (ex: `03:45`).

---

## 4. Componentes de Interface (UI Components)

### 4.1 Botões de Ação (Buttons)
* **Primary (Ação Principal):** Fundo Azul (`#3B82F6`), texto branco, cantos arredondados (`border-radius: 8px`). Efeito *hover* com leve clareamento.
* **Success / Live Trigger:** Fundo Verde Esmeralda (`#10B981`), utilizado para disparos manuais de comerciais ou ativação de microfone.
* **Danger / Emergency:** Fundo Vermelho Carmesim (`#EF4444`) com borda brilhante para interrupções e modo de emergência.

### 4.2 O Player On-Air (Card Principal)
* Um painel de destaque com borda sutil em Azul Neon (`#3B82F6` com 30% de opacidade).
* Exibe a capa do álbum (se houver) ou ícone padrão, título da faixa em destaque (`#F8FAFC`), artista em tom secundário (`#94A3B8`) e uma barra de progresso em gradiente de azul para verde.

### 4.3 Gestão de Blocos Comerciais (Satélite / Auto / Manual)
* **Pílulas de Status:** Indicadores visuais do modo atual do bloco comercial.
  * *Manual:* Ícone de mão / Fundo Âmbar.
  * *Automático:* Ícone de relógio / Fundo Azul.
  * *Via Satélite:* Ícone de antena parabólica / Fundo Verde.

---

## 5. Diretrizes de Usabilidade (UX Guidelines)

1. **Atalhos de Teclado Universais:** Toda ação crítica no ar (como soltar o próximo bloco ou pausar) deve ter um atalho de teclado intuitivo (ex: Espaço para Play/Pause, F1 a F4 para vinhetas rápidas).
2. **Feedback Sonoro e Visual:** Mudanças de estado (como o fim iminente de uma música) devem piscar sutilmente na cor âmbar quando faltarem 15 segundos para o término.
3. **Zero Fricção de Acervo:** A gaveta de arquivos deve apresentar uma árvore de diretórios limpa, permitindo arrastar e soltar músicas diretamente para a playlist sem telas modais intermediárias.
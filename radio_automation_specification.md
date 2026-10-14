# Especificação de Requisitos de Software (SRS)
## Sistema de Automação de Rádios

---

### 1. Visão Geral do Produto
O **AutoRádio Pro**  é um software de automação para emissoras de rádio desenvolvido para oferecer máxima estabilidade, leveza operacional e facilidade de uso. O sistema foi projetado para operar com tecnologia de ponta, atendendo desde rádios comunitárias e web-rádios até grandes emissoras comerciais.

#### 1.1 Características Principais
* **Software Leve e Otimizado:** Baixo consumo de recursos de CPU e memória RAM, permitindo rodar estavelmente mesmo em hardwares mais antigos ou máquinas de contingência (backup).
* **Interface Intuitiva:** Projetada para operação rápida e sem fricção, ideal para locutores e operadores de áudio sob pressão ao vivo.
* **Agilidade no Acervo (Sem Cadastro Prévio):** Dispensa o tedioso processo de catalogação, cadastro detalhado em banco de dados ou codificação prévia do acervo musical. O sistema lê diretamente as pastas de áudio do computador/rede.
* **Mixagem Inteligente e Instantânea:** Pontos de mixagem (fade in/out, transições) calculados e aplicados em tempo real, sem necessidade de edição prévia dos arquivos de áudio.
* **Flexibilidade de Blocos Comerciais:** Suporte completo para o disparo de comerciais em três modos distintos: **Manual**, **Automático** e **Via Satélite**.

---

### 2. Requisitos Funcionais (RF)

#### RF01 - Gerenciamento de Mídia sem Cadastro (Playthrough Direto)
* **Descrição:** O sistema deve permitir a importação e execução de músicas e vinhetas apontando diretamente para diretórios locais ou de rede (pastas de áudio).
* **Regra:** Não deve ser obrigatório preencher metadados (artista, álbum, gênero, ano) para que a música possa ir ao ar. O sistema deve ler as tags básicas do arquivo (ID3) ou extrair o nome diretamente do arquivo de áudio.

#### RF02 - Motor de Mixagem em Tempo Real
* **Descrição:** O software deve calcular os pontos de transição (cue/mix points) de forma dinâmica.
* **Regra:** As músicas na playlist devem transicionar suavemente (com sobreposição/crossfade configurável) sem que o operador precise editar o arquivo de áudio original.

#### RF03 - Gestão e Disparo de Blocos Comerciais
* **Descrição:** O sistema deve gerenciar a grade de programação comercial oferecendo três modalidades de disparo:
  1. **Manual:** O operador aciona o bloco comercial por comando direto (tecla de atalho ou clique).
  2. **Automático:** O bloco é disparado no horário exato programado na grade comercial.
  3. **Via Satélite:** O sistema deve detectar pulsos de fechamento (DTMF, GPIO ou silêncio de rede) ou sincronismo externo para iniciar e encerrar a grade comercial vinda de uma rede de satélite.

#### RF04 - Player de Ar (On-Air)
* **Descrição:** Tela principal dedicada à operação ao vivo, exibindo a música atual, tempo decorrido/restante, próxima música (preview) e status do automação.

---

### 3. Requisitos Não Funcionais (RNF)

* **RNF01 - Desempenho e Estabilidade:** O software deve operar 24/7 sem vazamentos de memória (*memory leaks*) ou travamentos. Em caso de falha na interface gráfica, o motor de áudio principal deve continuar rodando em background.
* **RNF02 - Compatibilidade de Áudio:** Suporte nativo aos formatos de áudio mais comuns do mercado (MP3, WAV, AAC, OGG, FLAC).
* **RNF03 - Latência de Áudio:** Baixa latência (utilizando drivers ASIO ou WASAPI exclusivos) para garantir precisão cirúrgica no disparo de vinhetas e comerciais.
* **RNF04 - Sistema Operacional:** Compatível com ambientes Windows (Windows 10 e 11, versões 32-bit e 64-bit).

---

### 4. Arquitetura de Alta Confiabilidade
* **Modo Redundância (Failover):** O sistema contará com um mecanismo de watchdog que, em caso de travamento crítico, assume a execução da playlist de segurança de forma transparente.
* **Log de Execução:** Registro automático de todas as músicas, comerciais e vinhetas executadas para fins de auditoria e emissão de relatórios (ECAD/SBC).
# Painel de Gerenciamento de Campanhas

Este projeto é um painel de gerenciamento de campanhas de marketing, permitindo aos usuários criar, visualizar, atualizar, excluir e acompanhar o desempenho de suas campanhas.

## Funcionalidades

*   Listar todas as campanhas com informações resumidas (ID, Nome, Status, Datas, Orçamento, Totais de Impressões/Cliques, CTR).
*   Criar novas campanhas com nome, datas de início/término, orçamento e status.
*   Visualizar detalhes de uma campanha específica.
*   Adicionar dados de performance diária (impressões, cliques) para cada campanha.
*   Visualizar um gráfico de performance diária (impressões vs. cliques) para cada campanha.
*   Editar informações de campanhas existentes.
*   Excluir campanhas.

## Tecnologias Utilizadas

**Backend:**
*   **Node.js:** Ambiente de execução JavaScript.
*   **Express.js:** Framework para construção da API RESTful.
*   **PostgreSQL:** Banco de dados relacional.
*   **node-postgres (pg):** Cliente PostgreSQL para Node.js.

**Frontend:**
*   **React:** Biblioteca JavaScript para construção de interfaces de usuário.
*   **React Router:** Para gerenciamento de rotas no lado do cliente.
*   **Axios:** Cliente HTTP para realizar requisições à API.
*   **Chart.js (`react-chartjs-2`):** Para renderização de gráficos.
*   **Vite:** Ferramenta de build e servidor de desenvolvimento para o frontend.

**Linguagens:**
*   JavaScript (ES6+)
*   SQL
*   HTML/CSS (via JSX e estilos)

**Gerenciador de Pacotes:**
*   npm

## Estrutura do Projeto

```
campaign_dashboard/
├── client/         # Código do frontend (React)
│   ├── public/
│   ├── src/
│   │   ├── components/ # (Opcional, se você estruturou assim)
│   │   ├── App.jsx
│   │   ├── CampaignDetail.jsx
│   │   ├── CampaignForm.jsx
│   │   ├── main.jsx
│   │   └── ... (outros arquivos e estilos)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/         # Código do backend (Node.js/Express)
│   ├── db/
│   │   └── index.js  # Configuração da conexão com o banco de dados
│   ├── middleware/
│   │   └── validation.js
│   ├── routes/
│   │   └── campaigns.js # Rotas da API para campanhas
│   ├── server.js     # Arquivo principal do servidor
│   └── package.json  # (Se você tiver um para o servidor)
│
├── database.sql    # Script SQL para setup inicial do banco (sugestão)
└── README.md       # Este arquivo
```

## Configuração e Instalação

### Pré-requisitos

*   **Node.js:** Versão 18.x ou superior (inclui npm).
*   **PostgreSQL:** Versão 14 ou superior, instalado e rodando.

### 1. Configuração do Banco de Dados

1.  **Crie um Banco de Dados:**
    Use o `psql` ou uma ferramenta gráfica de sua preferência para criar um novo banco de dados. Por exemplo:
    ```sql
    CREATE DATABASE campaign_dashboard_db;
    ```

2.  **Conecte-se ao Banco de Dados:**
    ```bash
    psql -U seu_usuario -d campaign_dashboard_db
    ```

3.  **Crie as Tabelas e a View:**
    Execute os seguintes comandos SQL. Você pode salvá-los em um arquivo `database.sql` e executá-lo, ou rodar os comandos diretamente.

    ```sql
    -- Tabela de Campanhas
    CREATE TABLE campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_date DATE,
        end_date DATE,
        budget DECIMAL(12, 2),
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabela de Performance Diária
    CREATE TABLE daily_performance (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        report_date DATE NOT NULL,
        impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),
        clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (campaign_id, report_date),
        CONSTRAINT clicks_not_greater_than_impressions CHECK (clicks <= impressions)
    );

    -- Função para atualizar o campo updated_at automaticamente
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Trigger para a tabela campaigns
    CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    -- View para agregar dados de performance e calcular CTR
    CREATE OR REPLACE VIEW campaigns_view AS
    SELECT
        c.id,
        c.name,
        c.status,
        c.start_date,
        c.end_date,
        c.budget,
        COALESCE(SUM(dp.impressions), 0) AS total_impressions,
        COALESCE(SUM(dp.clicks), 0) AS total_clicks,
        CASE
            WHEN COALESCE(SUM(dp.impressions), 0) > 0 THEN
                (COALESCE(SUM(dp.clicks), 0)::DECIMAL * 100.0 / SUM(dp.impressions))
            ELSE
                0.00
        END AS ctr,
        c.created_at,
        c.updated_at
    FROM
        campaigns c
    LEFT JOIN
        daily_performance dp ON c.id = dp.campaign_id
    GROUP BY
        c.id, c.name, c.status, c.start_date, c.end_date, c.budget, c.created_at, c.updated_at;
    ```

### 2. Configuração do Backend

1.  **Navegue até o diretório do servidor:**
    ```bash
    cd server
    ```

2.  **Configure a Conexão com o Banco de Dados:**
    Abra o arquivo `server/db/index.js` e ajuste os detalhes da conexão com o PostgreSQL para corresponder à sua configuração (usuário, senha, host, porta, nome do banco de dados).
    *Nota: Para um ambiente de produção, é recomendado usar variáveis de ambiente para essas configurações.*

3.  **Instale as dependências:**
    (Se você tiver um `package.json` no diretório `server/`)
    ```bash
    npm install
    ```
    Caso contrário, certifique-se de ter o `express` e `pg` instalados globalmente ou instale-os localmente no projeto:
    ```bash
    npm install express pg
    ```

4.  **Inicie o servidor backend:**
    ```bash
    node server.js
    ```
    Por padrão, o servidor deve rodar em `http://localhost:3001`.

### 3. Configuração do Frontend

1.  **Navegue até o diretório do cliente (em um novo terminal):**
    ```bash
    cd client
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento do frontend:**
    ```bash
    npm run dev
    ```
    Por padrão, a aplicação React (Vite) deve rodar em `http://localhost:5173` (ou uma porta similar, verifique o output do terminal).

## Como Utilizar

1.  **Acesse a Aplicação:** Abra seu navegador e vá para o endereço do frontend (geralmente `http://localhost:5173`).

2.  **Visualizar Campanhas:** A página inicial exibirá uma lista de todas as campanhas cadastradas.

3.  **Criar Nova Campanha:**
    *   Clique no botão "Criar Nova Campanha".
    *   Preencha o formulário com os detalhes da campanha (Nome, Data de Início, Data de Término, Orçamento, Status).
    *   Clique em "Criar Campanha" para salvar.

4.  **Ver Detalhes da Campanha:**
    *   Na lista de campanhas, clique no nome de uma campanha.
    *   Você será redirecionado para a página de detalhes, que mostra informações completas, um gráfico de performance e um formulário para adicionar dados diários.

5.  **Adicionar Dados de Performance Diária:**
    *   Na página de detalhes da campanha, localize o formulário "Adicionar Performance Diária".
    *   Selecione a data, insira o número de impressões e cliques.
    *   Clique em "Adicionar Dados". Os dados serão refletidos no gráfico e na tabela de registros.

6.  **Editar Campanha:**
    *   Na lista de campanhas, clique no botão "Editar" ao lado da campanha desejada.
    *   O formulário de edição será exibido com os dados atuais. Modifique conforme necessário e clique em "Atualizar Campanha".

7.  **Excluir Campanha:**
    *   Na lista de campanhas, clique no botão "Excluir" ao lado da campanha desejada.
    *   Confirme a exclusão na caixa de diálogo.

## Endpoints da API (Resumo)

O backend expõe os seguintes endpoints principais em `/api/campaigns`:

*   `GET /`: Lista todas as campanhas (da `campaigns_view`).
*   `POST /`: Cria uma nova campanha.
*   `GET /:id`: Retorna os detalhes de uma campanha específica (da `campaigns_view`).
*   `PUT /:id`: Atualiza uma campanha existente.
*   `DELETE /:id`: Exclui uma campanha.
*   `GET /:id/performance`: Retorna todos os registros de performance diária para uma campanha.
*   `POST /:id/performance`: Adiciona um novo registro de performance diária para uma campanha.

---

Sinta-se à vontade para ajustar este README conforme necessário para melhor refletir os detalhes específicos do seu projeto.
```# Painel de Gerenciamento de Campanhas

Este projeto é um painel de gerenciamento de campanhas de marketing, permitindo aos usuários criar, visualizar, atualizar, excluir e acompanhar o desempenho de suas campanhas.

## Funcionalidades

*   Listar todas as campanhas com informações resumidas (ID, Nome, Status, Datas, Orçamento, Totais de Impressões/Cliques, CTR).
*   Criar novas campanhas com nome, datas de início/término, orçamento e status.
*   Visualizar detalhes de uma campanha específica.
*   Adicionar dados de performance diária (impressões, cliques) para cada campanha.
*   Visualizar um gráfico de performance diária (impressões vs. cliques) para cada campanha.
*   Editar informações de campanhas existentes.
*   Excluir campanhas.

## Tecnologias Utilizadas

**Backend:**
*   **Node.js:** Ambiente de execução JavaScript.
*   **Express.js:** Framework para construção da API RESTful.
*   **PostgreSQL:** Banco de dados relacional.
*   **node-postgres (pg):** Cliente PostgreSQL para Node.js.

**Frontend:**
*   **React:** Biblioteca JavaScript para construção de interfaces de usuário.
*   **React Router:** Para gerenciamento de rotas no lado do cliente.
*   **Axios:** Cliente HTTP para realizar requisições à API.
*   **Chart.js (`react-chartjs-2`):** Para renderização de gráficos.
*   **Vite:** Ferramenta de build e servidor de desenvolvimento para o frontend.

**Linguagens:**
*   JavaScript (ES6+)
*   SQL
*   HTML/CSS (via JSX e estilos)

**Gerenciador de Pacotes:**
*   npm

## Estrutura do Projeto

```
campaign_dashboard/
├── client/         # Código do frontend (React)
│   ├── public/
│   ├── src/
│   │   ├── components/ # (Opcional, se você estruturou assim)
│   │   ├── App.jsx
│   │   ├── CampaignDetail.jsx
│   │   ├── CampaignForm.jsx
│   │   ├── main.jsx
│   │   └── ... (outros arquivos e estilos)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/         # Código do backend (Node.js/Express)
│   ├── db/
│   │   └── index.js  # Configuração da conexão com o banco de dados
│   ├── middleware/
│   │   └── validation.js
│   ├── routes/
│   │   └── campaigns.js # Rotas da API para campanhas
│   ├── server.js     # Arquivo principal do servidor
│   └── package.json  # (Se você tiver um para o servidor)
│
├── database.sql    # Script SQL para setup inicial do banco (sugestão)
└── README.md       # Este arquivo
```

## Configuração e Instalação

### Pré-requisitos

*   **Node.js:** Versão 18.x ou superior (inclui npm).
*   **PostgreSQL:** Versão 14 ou superior, instalado e rodando.

### 1. Configuração do Banco de Dados

1.  **Crie um Banco de Dados:**
    Use o `psql` ou uma ferramenta gráfica de sua preferência para criar um novo banco de dados. Por exemplo:
    ```sql
    CREATE DATABASE campaign_dashboard_db;
    ```

2.  **Conecte-se ao Banco de Dados:**
    ```bash
    psql -U seu_usuario -d campaign_dashboard_db
    ```

3.  **Crie as Tabelas e a View:**
    Execute os seguintes comandos SQL. Você pode salvá-los em um arquivo `database.sql` e executá-lo, ou rodar os comandos diretamente.

    ```sql
    -- Tabela de Campanhas
    CREATE TABLE campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_date DATE,
        end_date DATE,
        budget DECIMAL(12, 2),
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabela de Performance Diária
    CREATE TABLE daily_performance (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        report_date DATE NOT NULL,
        impressions INTEGER DEFAULT 0 CHECK (impressions >= 0),
        clicks INTEGER DEFAULT 0 CHECK (clicks >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (campaign_id, report_date),
        CONSTRAINT clicks_not_greater_than_impressions CHECK (clicks <= impressions)
    );

    -- Função para atualizar o campo updated_at automaticamente
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Trigger para a tabela campaigns
    CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    -- View para agregar dados de performance e calcular CTR
    CREATE OR REPLACE VIEW campaigns_view AS
    SELECT
        c.id,
        c.name,
        c.status,
        c.start_date,
        c.end_date,
        c.budget,
        COALESCE(SUM(dp.impressions), 0) AS total_impressions,
        COALESCE(SUM(dp.clicks), 0) AS total_clicks,
        CASE
            WHEN COALESCE(SUM(dp.impressions), 0) > 0 THEN
                (COALESCE(SUM(dp.clicks), 0)::DECIMAL * 100.0 / SUM(dp.impressions))
            ELSE
                0.00
        END AS ctr,
        c.created_at,
        c.updated_at
    FROM
        campaigns c
    LEFT JOIN
        daily_performance dp ON c.id = dp.campaign_id
    GROUP BY
        c.id, c.name, c.status, c.start_date, c.end_date, c.budget, c.created_at, c.updated_at;
    ```

### 2. Configuração do Backend

1.  **Navegue até o diretório do servidor:**
    ```bash
    cd server
    ```

2.  **Configure a Conexão com o Banco de Dados:**
    Abra o arquivo `server/db/index.js` e ajuste os detalhes da conexão com o PostgreSQL para corresponder à sua configuração (usuário, senha, host, porta, nome do banco de dados).
    *Nota: Para um ambiente de produção, é recomendado usar variáveis de ambiente para essas configurações.*

3.  **Instale as dependências:**
    (Se você tiver um `package.json` no diretório `server/`)
    ```bash
    npm install
    ```
    Caso contrário, certifique-se de ter o `express` e `pg` instalados globalmente ou instale-os localmente no projeto:
    ```bash
    npm install express pg
    ```

4.  **Inicie o servidor backend:**
    ```bash
    node server.js
    ```
    Por padrão, o servidor deve rodar em `http://localhost:3001`.

### 3. Configuração do Frontend

1.  **Navegue até o diretório do cliente (em um novo terminal):**
    ```bash
    cd client
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento do frontend:**
    ```bash
    npm run dev
    ```
    Por padrão, a aplicação React (Vite) deve rodar em `http://localhost:5173` (ou uma porta similar, verifique o output do terminal).

## Como Utilizar

1.  **Acesse a Aplicação:** Abra seu navegador e vá para o endereço do frontend (geralmente `http://localhost:5173`).

2.  **Visualizar Campanhas:** A página inicial exibirá uma lista de todas as campanhas cadastradas.

3.  **Criar Nova Campanha:**
    *   Clique no botão "Criar Nova Campanha".
    *   Preencha o formulário com os detalhes da campanha (Nome, Data de Início, Data de Término, Orçamento, Status).
    *   Clique em "Criar Campanha" para salvar.

4.  **Ver Detalhes da Campanha:**
    *   Na lista de campanhas, clique no nome de uma campanha.
    *   Você será redirecionado para a página de detalhes, que mostra informações completas, um gráfico de performance e um formulário para adicionar dados diários.

5.  **Adicionar Dados de Performance Diária:**
    *   Na página de detalhes da campanha, localize o formulário "Adicionar Performance Diária".
    *   Selecione a data, insira o número de impressões e cliques.
    *   Clique em "Adicionar Dados". Os dados serão refletidos no gráfico e na tabela de registros.

6.  **Editar Campanha:**
    *   Na lista de campanhas, clique no botão "Editar" ao lado da campanha desejada.
    *   O formulário de edição será exibido com os dados atuais. Modifique conforme necessário e clique em "Atualizar Campanha".

7.  **Excluir Campanha:**
    *   Na lista de campanhas, clique no botão "Excluir" ao lado da campanha desejada.
    *   Confirme a exclusão na caixa de diálogo.

## Endpoints da API (Resumo)

O backend expõe os seguintes endpoints principais em `/api/campaigns`:

*   `GET /`: Lista todas as campanhas (da `campaigns_view`).
*   `POST /`: Cria uma nova campanha.
*   `GET /:id`: Retorna os detalhes de uma campanha específica (da `campaigns_view`).
*   `PUT /:id`: Atualiza uma campanha existente.
*   `DELETE /:id`: Exclui uma campanha.
*   `GET /:id/performance`: Retorna todos os registros de performance diária para uma campanha.
*   `POST /:id/performance`: Adiciona um novo registro de performance diária para uma campanha.

---

Sinta-se à vontade para ajustar este README conforme necessário para melhor refletir os detalhes específicos do seu projeto.
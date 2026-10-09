# Guia do projeto para agentes de desenvolvimento

Este arquivo é a orientação principal para agentes que implementam, revisam ou documentam mudanças neste repositório. Leia-o antes de editar código. Ele descreve o comportamento observado nos arquivos atuais; quando houver divergência, o código e os arquivos de configuração ativos prevalecem sobre descrições antigas no README.

## 1. Visão do produto

O Controle Financeiro é uma aplicação web para uma pessoa registrar e consultar receitas, despesas, categorias e cartões. A interface é HTML/CSS/JavaScript sem framework de frontend. A API usa Node.js com ES Modules e Express. O armazenamento principal é MySQL via TypeORM; o Redis guarda refresh tokens e contadores de limitação de tentativas.

Funcionalidades existentes:

- Cadastro, login, renovação de sessão e logout.
- Painel com entradas, saídas e categorias de maior gasto nos últimos 30 dias.
- Cadastro e consulta de transações de entrada ou saída.
- Pagamento por cartão de crédito com parcelas e cálculo das datas de vencimento.
- Extrato filtrado por intervalo de datas, com totais e gráfico de despesas.
- Cadastro, edição, ativação/desativação e listagem de cartões.
- Cadastro, edição, ativação/desativação e listagem de categorias.
- Formas de pagamento listadas a partir da tabela de referência `METODO_PAGAMENTO`.
- Documentação interativa da API pelo Swagger UI.

## 2. Estrutura do repositório

```text
src/
  app.js                         Configuração do Express, middleware e montagem das rotas
  server.js                      Inicialização da API, MySQL e Redis
  docs/openapi.js                 Especificação OpenAPI usada pelo Swagger UI
  domains/
    auth/                         Entidade, repositório e rotas de autenticação
    financial/
      entities/                   Objetos de domínio simples
      infra/
        controllers/              Adaptadores HTTP para os casos de uso
        repositories/             Consultas e persistência TypeORM
        financial.routes.js        Rotas financeiras autenticadas
      useCases/                    Regras de aplicação por operação
      utils/                       Utilitários de datas/parcelas
  shared/infra/
    auth/                          JWT, hash de senha, Redis e rate limiting
    http/                          Respostas de erro HTTP
    typeorm/                       DataSource, schemas e SQL manual

frontend/
  auth/                            Tela e script de login/cadastro
  pagina_inicial/                  Dashboard
  cadastrar_transacao/             Formulário de lançamento
  extrato/                         Extrato e gráfico
  pagina_cartoes/                  Gerenciamento de cartões
  pagina_categorias/               Gerenciamento de categorias
  components/                      Autenticação de frontend, navbar e datas

docs/                              Guia de produção e documentação de segurança/deploy
compose.yml                        Compose de desenvolvimento
compose.production.yml             Exemplo Compose de produção
dockerfile                         Imagem de desenvolvimento
dockerfile.production              Imagem de produção
.github/workflows/                 Automação de CI
```

## 3. Arquitetura e fluxo de uma requisição

No backend, preserve a separação que o projeto já usa:

1. **Rotas** declaram método, caminho e middleware. Veja `src/domains/*/infra/*.routes.js`.
2. **Controllers** leem parâmetros HTTP, chamam casos de uso e escolhem status/resposta.
3. **Use cases** concentram regras de negócio e coordenam repositórios.
4. **Repositories** encapsulam TypeORM e consultas MySQL.
5. **Entities** representam os dados do domínio; **EntitySchema** em `src/shared/infra/typeorm/schemas/` mapeia esses objetos às tabelas.

Ao implementar uma funcionalidade financeira, siga o fluxo rota → controller → use case → repository. Não coloque regra de domínio em HTML nem consulta TypeORM diretamente na rota.

### Fronteira de usuário e autorização

As rotas em `/financial` aplicam `authenticationMiddleware`. Ele valida o JWT e define `req.userId`. Esse ID autenticado deve ser a única fonte para dono dos dados; nunca confie em `userId` vindo do JSON, query string ou parâmetro do cliente.

Cartões, categorias e transações têm `user_id`. As consultas por ID, listagens e agregações devem filtrar por `userId`. Ao associar uma transação a cartão/categoria, confirme que esses recursos pertencem ao mesmo usuário. Formas de pagamento são dados de referência compartilhados.

Controllers de atualização de cartão, categoria e transação devem passar campos permitidos explicitamente aos casos de uso e definir `userId` a partir de `req.userId`. Nunca espalhe `req.body` depois do usuário autenticado.

Criações atualmente usam `{ ...req.body, userId: req.userId }`, que sobrescreve um `userId` malicioso do body; preserve essa ordem ou use DTO allowlist.

## 4. Domínio financeiro e dados

### Entidades e tabelas

| Conceito | Entidade / schema | Tabela | Observações |
|---|---|---|---|
| Usuário | `User` / `UserSchema` | `USUARIOS` | Nome único, hash de senha; email opcional no modelo atual |
| Cartão | `Card` / `CardSchema` | `CARTOES` | Tem proprietário, nome, dia de fechamento/vencimento e flag ativo |
| Categoria | `EntryCategory` / `EntryCategorySchema` | `CATEGORIAS_LANCAMENTOS` | Tem proprietário, descrição e flag ativo |
| Transação | `Transaction` / `TransactionSchema` | `TRANSACOES` | Proprietário, categoria, forma, tipo, data e cartão opcional |
| Parcela | `Installment` / `InstallmentSchema` | `PARCELAS` | Filha da transação; valor em centavos e data de vencimento |
| Forma de pagamento | `PaymentMethod` / `PaymentMethodSchema` | `METODO_PAGAMENTO` | Tabela de referência; cadastro/seeding não está implementado aqui |

O código interpreta valores monetários como inteiros em centavos. Preserve isso na API e no banco; não converta para ponto flutuante para persistir valores.

`src/shared/infra/typeorm/data-source.js` configura MySQL com `synchronize: false` e migrations TypeORM executadas na inicialização. A migration inicial cria as tabelas para bancos vazios e cadastra os métodos de pagamento de referência. Ela não converte tabelas legadas existentes; compare o schema e planeje migração de dados antes de usar em um banco já povoado.

O utilitário `src/domains/financial/utils/installmentDates.js` calcula vencimentos e trata dias inexistentes no mês. O caso de uso `CreateTransaction.js` contém atualmente uma lógica própria para gerar parcelas e não importa esse utilitário. Antes de alterar cálculo de datas, compare os dois caminhos e evite deixá-los divergentes.

## 5. API atual

Base local: `http://localhost:8080`. A API usa `express.json({ limit: '10kb' })`, Helmet, CORS de desenvolvimento para `localhost:5500`/`127.0.0.1:5500` e middleware de erro ao final.

### Autenticação — `/auth`

| Método e caminho | Acesso | Função |
|---|---|---|
| `POST /auth/register` | Público, com rate limit | Cria usuário e salva hash scrypt |
| `POST /auth/login` | Público, com rate limit | Retorna JWT de acesso de 30 min e cookie HttpOnly de refresh de 1 dia |
| `POST /auth/refreshToken` | Público; requer cookie e `userId` | Confere e rotaciona refresh token no Redis |
| `POST /auth/logout` | Público; usa cookie e `userId` | Revoga refresh token e limpa cookie |

As senhas são armazenadas usando `scrypt`, sal aleatório e comparação de tamanho constante. O JWT usa HS256 e `JWT_SECRET` com no mínimo 32 caracteres. O frontend guarda o token de acesso e `userId` em `sessionStorage`; o refresh token fica em cookie `HttpOnly`, `SameSite=Strict`, e `Secure` em produção.

O middleware de rate limit usa Redis: login tem limites por IP e pela combinação IP/nome de usuário; cadastro tem limite por IP. Se o Redis estiver indisponível, as rotas limitadas falham fechadas com `503`.

### Financeiro — `/financial`

Todas as rotas abaixo requerem `Authorization: Bearer <JWT>`.

| Método e caminho | Operação |
|---|---|
| `GET /financial/dashboard` | Totais de receitas e despesas dos últimos 30 dias |
| `GET /financial/dashboard/top-categories` | Até cinco categorias de despesa do período |
| `GET /financial/transactions/statement?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` | Parcelas no intervalo, resumo, saldo e totais diários |
| `GET /financial/payment-methods` | Lista formas de pagamento globais disponíveis |
| `GET /financial/cards?activeOnly=true` | Lista cartões do usuário e contagem de transações |
| `POST /financial/cards` | Cria cartão |
| `PUT /financial/cards/:id` | Atualiza cartão |
| `DELETE /financial/cards/:id` | Desativa cartão (soft delete) |
| `GET /financial/entryCategory` | Lista categorias do usuário |
| `POST /financial/entryCategory` | Cria categoria |
| `PUT /financial/entryCategory/:id` | Atualiza descrição/estado ativo |
| `DELETE /financial/entryCategory/:id` | Exclui categoria se as relações permitirem |
| `POST /financial/transactions` | Cria transação e parcelas em transação MySQL atômica |
| `PUT /financial/transactions/:id` | Atualiza campos permitidos da transação |
| `DELETE /financial/transactions/:id` | Exclui transação do usuário |

Há métodos para outras estatísticas em alguns controllers/use cases, mas só considere uma rota disponível se ela estiver montada em `financial.routes.js`.

## 6. Fluxo do frontend

- `frontend/components/auth.js` determina a URL da API. Com Live Server na porta 5500 usa `http(s)://<host>:8080`; servido em produção usa `<mesma-origem>/api`.
- Esse componente envolve `window.fetch`: para chamadas financeiras injeta o Bearer token, tenta refresh em `401` e redireciona para login se a sessão expirou. Rotas `/auth/` ficam fora da injeção do Bearer.
- `frontend/auth/script.js` envia login/cadastro e guarda o token de acesso e ID da conta em `sessionStorage`.
- `frontend/components/navbar.js` carrega componentes da navbar; `date-utils.js` fornece datas e máscaras de entrada.
- As páginas financeiras obtêm dados pela API e atualizam seus elementos. Para conteúdo vindo de usuário/banco, prefira `textContent` ou nós DOM; não interpolar valores em `innerHTML` sem escape correto.
- A CSP do frontend está documentada como `Report-Only` no roteiro de VPS. Para a proteção ficar efetiva, o operador deve revisar violações e configurar a política em modo de bloqueio no NGINX. O Swagger recebe CSP em modo de relatório.

As telas são arquivos estáticos. `dockerfile.production` copia apenas `src`; a distribuição do frontend fica a cargo do NGINX/hospedagem estática.

## 7. Executar e configurar localmente

### Requisitos e comandos

- Node.js 24 ou compatível com as APIs usadas (`node:watch`, `fetch`, ES Modules).
- MySQL e Redis disponíveis.
- Dependências: `npm ci` para instalação fiel ao lockfile.
- API local: `npm run start:dev` (usa `node --watch src/server.js`) após configurar ambiente e iniciar MySQL/Redis.
- Estilo: `npm run lint`.
- Auditoria de dependências: `npm run audit` (falha a partir de nível moderado).
- Swagger: `http://localhost:8080/api-docs`.
- Saúde/liveness: `GET http://localhost:8080/health`.

O `.env.dev` é carregado pelo DataSource apenas fora de produção. Variáveis comuns: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (em desenvolvimento também existe fallback para `MYSQL_ROOT_PASSWORD`), `JWT_SECRET` e `REDIS_URL`. O segredo JWT precisa ter ao menos 32 caracteres.

### Docker Compose

- `compose.yml` é para desenvolvimento: monta o código, inicia Nodemon pela imagem `dockerfile` e publica API 8080, MySQL 3306 e Redis 6379. Não o use diretamente na internet.
- `compose.production.yml` e `dockerfile.production` são a base de produção: processo Node sem Nodemon, usuário não-root, API publicada só em localhost, MySQL/Redis sem portas publicadas, senha dedicada de banco e senha Redis.
- O `.env.production` deve ficar fora do Git e é passado ao comando Compose com `--env-file`; nunca coloque valores reais em arquivos versionados, Dockerfile ou frontend.
- MySQL usa volume `mysql_data`. Recriar Redis apaga refresh tokens e contadores de rate limit; usuários podem ter de autenticar novamente.
- Para NGINX, firewall, HTTPS, backup e migração inicial, siga [`docs/primeiro-deploy-vps.md`](docs/primeiro-deploy-vps.md).

## 8. Erros e observabilidade

`src/shared/infra/http/errors.js` responde erros inesperados com mensagem genérica e `requestId`. O log atual guarda o identificador, operação, nome e código/tipo do erro, sem corpo da requisição ou stack completa. Use o `requestId` para correlacionar a falha com logs da aplicação.

Não reintroduza `error.message`/stack diretamente nas respostas HTTP. Para diagnóstico adicional, use logging estruturado com dados redigidos e acesso restrito; nunca registre senha, JWT, refresh token, cookie completo ou corpo financeiro inteiro.

## 9. Deploy e documentação de produção

Os documentos mantidos para operação são:

- [`docs/guia-producao.md`](docs/guia-producao.md): lacunas/configuração e estratégia geral.
- [`docs/primeiro-deploy-vps.md`](docs/primeiro-deploy-vps.md): passos de VPS, firewall, segredos, Compose, NGINX e HTTPS.
- [`docs/melhorias-seguranca.md`](docs/melhorias-seguranca.md): explicação das correções da revisão de segurança.

Pontos ainda dependentes de configuração/implementação fora do deploy básico:

- A migration inicial cria o schema e a tabela de formas de pagamento em bancos vazios; bancos existentes precisam de avaliação antes da atualização.
- O OpenAPI declara servidor local; atualize a URL publicada ao expor Swagger.
- A CSP dos arquivos estáticos precisa ser revisada/aplicada no NGINX.
- A proteção por IP depende de configurar `TRUST_PROXY` para o proxy/gateway correto.
- Preserve o uso de campos permitidos e `req.userId` autenticado nos controllers de atualização.

## 10. Regras para futuras mudanças

1. Leia os arquivos relevantes e `git status` antes de editar; preserve alterações preexistentes do usuário.
2. Confirme o comportamento atual no código. O README pode estar defasado: por exemplo, o script `npm run start` descrito nele não existe em `package.json`, e o Compose atual não inicia um servidor de arquivos frontend na porta 5500.
3. Mantenha separação de camadas, nomes e padrões já usados; limite a alteração ao escopo solicitado.
4. Nunca aceite `userId` de payload como identidade autenticada. Aplique ownership nos reads, updates, deletes e associações.
5. Valide entrada no backend mesmo se a tela já tiver validação. Ao adicionar valores de usuário ao HTML, renderize como texto.
6. Não exponha detalhes de erro/segredo ao cliente nem adicione logs de payloads sensíveis.
7. Ao alterar API, atualize `src/docs/openapi.js` e documentação pertinente. Ao alterar configuração de dados, atualize schemas e documente a migração SQL necessária.
8. Não altere schema de banco com `synchronize: true`. Escreva migração explícita, com plano para dados existentes e rollback quando possível.
9. Não edite `.env.dev`/`.env.production` com credenciais reais nem inclua segredos em fixtures, logs ou commits.
10. Não assuma que uma rota/controller é usada só porque existe; confira o router montado. Atualize o frontend, Swagger e documentação quando a rota efetivamente mudar.
11. Verifique com `npm run lint` e `npm run audit` quando apropriado. O repositório não define atualmente um script de testes automatizados; não afirme que testes passaram se não foram adicionados/executados.
12. Documente decisões, limitações e comportamento visível ao usuário em português, no estilo conciso já usado pelo projeto.

### Divergências conhecidas na documentação

- O `README.md` ainda descreve `npm run start` e afirma que o Compose inicia o frontend na porta 5500. Hoje existe apenas `npm run start:dev`; o `compose.yml` publica a API em 8080, MySQL em 3306 e Redis em 6379. Para testar a interface localmente, é preciso servir `frontend/` separadamente (por exemplo, com Live Server).
- O `README.md` e `src/docs/openapi.js` descrevem email no cadastro e o README também menciona o campo alternativo `usuario`. A implementação atual de `POST /auth/register` só lê `username` e `password`; `email` é ignorado e `usuario` não é aceito. Ao alterar autenticação, alinhe implementação, OpenAPI, frontend e README em conjunto.
- `docs/guia-producao.md` ainda contém detalhes antigos sobre o cadastro; confirme os campos aceitos em `auth.routes.js` ao alterar autenticação.

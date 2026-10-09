# Projeto de Controle Financeiro

Aplicação web para registrar e acompanhar receitas e despesas. O projeto tem uma interface em HTML, CSS e JavaScript, uma API em Node.js/Express e persistência em MySQL.

## Funcionalidades

- Painel inicial com resumo financeiro e indicadores por categoria e forma de pagamento.
- Cadastro e consulta de lançamentos de entrada e saída, com categoria, forma de pagamento e data.
- Registro de compras parceladas e compras associadas a cartão de crédito.
- Extrato de lançamentos.
- Cadastro e gerenciamento de cartões e categorias.

Cadastro e login ficam disponíveis em `/auth`; as rotas financeiras exigem um JWT válido.

## Requisitos

- Node.js 24 ou compatível com ES Modules e npm.
- MySQL 9 ou compatível.
- Um navegador moderno.
- Para a opção com containers: Docker e Docker Compose.

## Configuração do banco

Na raiz do projeto, crie ou edite o arquivo `.env.dev`:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
MYSQL_ROOT_PASSWORD=sua_senha
DB_NAME=controle_financeiro
TZ=America/Sao_Paulo
```

O TypeORM está configurado com `synchronize: false`. Na inicialização, a API executa as migrations pendentes; a migration inicial cria as tabelas e carrega os métodos de pagamento. Crie o banco indicado por `DB_NAME` e configure o acesso antes de iniciar a API. Não publique credenciais reais no Git.

## Executar no Windows ou Linux sem Docker

As etapas são as mesmas nos dois sistemas. Instale Node.js e MySQL, configure o banco conforme a seção anterior e, no terminal, acesse a pasta do projeto.

```bash
npm install
npm run start
```

Esse comando inicia a API com Node.js na porta `8080` e o frontend com Live Server na porta `5500`. A API inicia quando consegue conectar ao banco. Acesse `http://localhost:5500/pagina_inicial/` no navegador. As páginas também podem ser acessadas diretamente:

- `http://localhost:5500/pagina_inicial/`
- `http://localhost:5500/cadastrar_transacao/`
- `http://localhost:5500/extrato/`
- `http://localhost:5500/pagina_cartoes/`
- `http://localhost:5500/pagina_categorias/`

A API permite chamadas da interface servida em `localhost:5500` ou `127.0.0.1:5500`.

## Executar com Docker Compose

O Compose inicia a API, o MySQL, o Redis e um NGINX que serve a interface. Crie `.env.dev` na raiz antes de subir os serviços. Nesse modo, use o nome do serviço do banco como host:

```dotenv
DB_HOST=database
DB_PORT=3306
DB_USER=root
MYSQL_ROOT_PASSWORD=sua_senha
DB_NAME=controle_financeiro
TZ=America/Sao_Paulo
JWT_SECRET=gere_um_segredo_aleatorio_com_ao_menos_32_caracteres
```

Inicie em segundo plano:

```bash
docker compose up --build -d
```

Abra `http://localhost` (ou `http://localhost:8081` se definir `FRONTEND_PORT=8081`). A porta 80 é a padrão. Para iniciar tudo automaticamente quando a máquina ligar, deixe o Docker Engine configurado para iniciar com o sistema; os containers usam `restart: always`. A API continua disponível em `http://localhost:8080` para diagnóstico.

Os dados do MySQL ficam no volume `mysql_data`. No primeiro início, a API aplica a migration inicial e cadastra `cartao_credito`, `cartao_debito`, `dinheiro` e `pix` como formas de pagamento. As migrations pendentes também são aplicadas em atualizações; `synchronize` permanece desligado. Para parar os containers, use `docker compose down`; não use `docker compose down -v`, que apaga os dados do banco.

## API

## Implantação em produção

Para arquitetura, ajustes necessários no projeto e fluxo de deploy, consulte o [Guia de produção](docs/guia-producao.md).

## Autenticação

Configure um segredo JWT aleatório com pelo menos 32 caracteres no `.env.dev`:

```dotenv
JWT_SECRET=coloque_aqui_um_segredo_aleatorio_com_32_caracteres_ou_mais
REDIS_URL=redis://localhost:6379
```

O Redis armazena o refresh token por um dia. No Docker Compose, o serviço `app` usa `redis://redis:6379`; sem Docker, inicie Redis local ou ajuste `REDIS_URL`.

1. `POST /auth/register` recebe `{ "username": "ana", "email": "ana@example.com", "password": "senha-com-8-caracteres" }` e cria a conta sem confirmação por email. Também aceita `usuario` no lugar de `username`.
2. A tela de acesso fica em `http://localhost:5500/auth/`. `POST /auth/login` retorna `userId` e `acessToken` (JWT válido por 30 minutos); o `refreshToken` de 1 dia é enviado como cookie `HttpOnly` e não fica disponível ao JavaScript. O navegador mantém apenas `userId` e `acessToken` no `sessionStorage`.
3. Envie o JWT nas rotas `/financial` usando `Authorization: Bearer <acessToken>`.
4. `POST /auth/refreshToken` recebe `{ "userId": "<id retornado no cadastro>" }`; o navegador envia o cookie automaticamente. A API compara o cookie com o valor no Redis e o rotaciona. Se inválido ou expirado, a API retorna `401` para o cliente voltar ao login.

Em bancos existentes, confira se o schema corresponde à migration inicial antes de iniciar esta versão. A migration cria tabelas ausentes, mas não transforma tabelas legadas. Faça backup antes de qualquer mudança estrutural.

A documentação interativa Swagger fica disponível em `http://localhost:8080/api-docs`
depois que a API estiver iniciada. Nela, você pode consultar os endpoints documentados,
preencher os parâmetros e executar chamadas usando **Try it out**. Para testar operações
que alteram dados, use uma base de desenvolvimento.

As rotas financeiras usam o prefixo `/financial`. Entre elas estão:

- `GET /financial/dashboard` e rotas auxiliares de categorias e formas de pagamento do painel.
- `GET`, `POST`, `PUT` e `DELETE /financial/cards` para gerenciar cartões.
- `GET`, `POST`, `PUT` e `DELETE /financial/entryCategory` para gerenciar categorias.
- `POST /financial/transactions`, `GET /financial/transactions/statement`, `PUT /financial/transactions/:id` e `DELETE /financial/transactions/:id` para lançamentos.

## Verificação de estilo

Para executar o ESLint:

```bash
npm run lint
```

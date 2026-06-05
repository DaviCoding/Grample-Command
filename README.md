# Grample Command

Painel operacional técnico da Grample para repositórios, deploys e serviços.

## Escopo

O Command cuida apenas de infraestrutura de aplicação:

- repositórios Git;
- inicialização e atualização de projetos;
- Docker Compose;
- execução individual de serviços por repositório;
- backups técnicos;
- healthchecks;
- histórico de deploy;
- auditoria de ações operacionais.

Ele não deve conter administração de empresas, clientes, pedidos, usuários finais ou qualquer fluxo de negócio da plataforma.

## Rodar

```bash
pnpm install
cp .env.example .env
pnpm hash:password "troque-esta-senha"
pnpm dev
```

Preencha no `.env`:

```env
COMMAND_ADMIN_USERNAME=admin
COMMAND_ADMIN_PASSWORD_HASH=scrypt$...
COMMAND_SESSION_SECRET=use-um-segredo-com-32-ou-mais-caracteres
```

Abra:

```txt
http://localhost:3333
```

## Onde colocar os projetos

No servidor Linux, recomendado:

```txt
/apps
├── grample-backend
├── grample-renderer
├── grample-frontend
└── grample-command
```

No `.env`:

```env
PROJECTS_BASE_PATH=/apps
GITHUB_TOKEN=github_pat_xxx
```

No Windows, exemplo:

```env
PROJECTS_BASE_PATH=C:/Users/Davi Alves/Documents/CODE
```

## Segurança

- Autenticação obrigatória por usuário e senha definidos via `.env`.
- Senha armazenada apenas como hash `scrypt`.
- Sessão assinada em cookie `HttpOnly`.
- CSRF obrigatório em ações mutáveis.
- Rate limit global e rate limit específico de login.
- Auditoria em `source/storage/audit-events.json`.

## Execução por repositório

A tela `/execution` controla cada projeto configurado em `source/storage/projects.json`.

Cada projeto usa:

```txt
PROJECTS_BASE_PATH + project.directory
project.composeFile
```

Ações disponíveis:

- status: `docker compose ps --format json`;
- logs: `docker compose logs --tail`;
- start: `docker compose up -d`;
- stop: `docker compose stop`;
- restart: `docker compose restart`;
- rebuild: `docker compose up -d --build`;
- down: `docker compose down`.

As ações são auditadas e executadas apenas após autenticação + CSRF.

## Token GitHub

Use fine-grained token:

- Repository access: apenas os repos necessários;
- Contents: Read-only;
- Metadata: Read-only.

Nunca registre token em logs, histórico de deploy ou auditoria.

## Configuração dos projetos

Edite:

```txt
source/storage/projects.json
```

Exemplo:

```json
{
  "id": "grample-backend",
  "name": "Backend",
  "repository": "https://github.com/DaviCoding/Grample-Backend.git",
  "directory": "grample-backend",
  "branch": "main",
  "composeFile": "docker-compose.yml",
  "healthcheckUrl": "https://api.grample.app/health",
  "databaseUrlEnv": "DATABASE_URL",
  "enabled": true
}
```

A Command resolve o path final assim:

```txt
PROJECTS_BASE_PATH + directory
```
# Grample Command

O Grample Command e o painel operacional tecnico da Grample. Ele e responsavel por
clonar, atualizar, validar, iniciar, parar, reconstruir e observar os repositorios
da plataforma.

## Bootstrap da Grample

O fluxo canonico para recriar a plataforma e:

1. Subir apenas o `grample-command`.
2. Acessar `Projetos`.
3. Garantir que cada projeto tenha `.env no vault`.
4. Executar `Inicializar Grample`.

O botao `Inicializar Grample` executa, nessa ordem:

1. Cria ou valida a rede Docker `grample_net` (o compose do proprio Command tambem cria essa rede no primeiro `up`).
2. Garante o registry padrao dos projetos:
   - `grample-backend`
   - `grample-renderer`
   - `grample-frontend`
3. Clona repositorios ausentes em `PROJECTS_BASE_PATH`.
4. Adota `.env` existente quando o repo ja existe e o vault ainda nao existe.
5. Aplica o `.env` guardado no vault antes do `docker compose up`.
6. Executa `docker compose config --quiet`.
7. Sobe os projetos na ordem:
   - backend
   - renderer
   - frontend
8. Valida healthchecks.

## Vault de .env

Os arquivos `.env` dos projetos gerenciados ficam guardados no vault local do
Command em `PROJECT_ENVS_PATH`:

```txt
source/storage/envs/grample-backend.env
source/storage/envs/grample-renderer.env
source/storage/envs/grample-frontend.env
```

Esses arquivos sao write-once pelo painel e nao sao exibidos novamente pela UI.
Eles tambem nao entram no Git.

## Producao

Na VPS, use:

```env
NODE_ENV=production
PROJECTS_BASE_PATH=/apps
PROJECTS_HOST_PATH=/apps
BACKUPS_HOST_PATH=/opt/command/backups
PROJECT_ENVS_PATH=source/storage/envs
PROJECTS_NETWORK_NAME=grample_net
```

O Command deve ser o unico ponto operacional para pull, deploy, rebuild e
controle de containers.

## Desenvolvimento

No PC local, use `PROJECTS_BASE_PATH` apontando para a pasta de desenvolvimento,
por exemplo:

```env
NODE_ENV=development
PROJECTS_BASE_PATH=C:\Users\Davi Alves\Documents\CODE
PROJECT_ENVS_PATH=source/storage/envs
PROJECTS_NETWORK_NAME=grample_net
```

Assim o mesmo Command consegue operar os repos locais usando os mesmos compose
files de command/dev.

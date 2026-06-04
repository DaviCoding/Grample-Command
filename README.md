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

# Setup

Coloque os projetos em:

```txt
/apps/grample-backend
/apps/grample-renderer
/apps/grample-frontend
/apps/grample-command
```

Configure `source/storage/projects.json`.

Para backup de PostgreSQL, defina `databaseUrlEnv` no projeto e a variável correspondente no `.env` da Command.

## Segurança operacional

O painel exige autenticação antes de qualquer rota operacional.

Gere o hash da senha:

```bash
pnpm hash:password "senha-forte"
```

Configure:

```env
COMMAND_ADMIN_USERNAME=admin
COMMAND_ADMIN_PASSWORD_HASH=scrypt$...
COMMAND_SESSION_SECRET=use-um-segredo-com-32-ou-mais-caracteres
COMMAND_COOKIE_SECURE=true
```

Em desenvolvimento local sem HTTPS, use `COMMAND_COOKIE_SECURE=false`.

As ações técnicas registram auditoria em `source/storage/audit-events.json`.

## Docker Compose por projeto

Cada projeto precisa informar `composeFile` em `source/storage/projects.json`.

O Command executa Docker sempre dentro do diretório resolvido do projeto:

```txt
PROJECTS_BASE_PATH + directory
```

Isso permite controlar individualmente cada repositório sem depender de um compose global da Grample.

Para melhor previsibilidade em produção:

- mantenha um `docker-compose.yml` por repositório;
- use nomes de serviços claros;
- defina healthcheck no compose quando possível;
- evite comandos manuais fora do Command para não perder rastreabilidade operacional.

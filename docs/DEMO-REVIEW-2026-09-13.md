# Demo Review 2026-09-13

## Chat Demo Setup

### TiDB Migration

Apply the chat table migration:

```bash
mysql -h <tidb-host> -P 4000 -u <user> -p <database> < migrations/20260913_create_chat.sql
```

Or via your migration runner if configured.

### Environment Variable

Set `CHAT_DEMO_ENABLED=true` for local loopback access:

```bash
CHAT_DEMO_ENABLED=true npm run dev
```

| Variable            | Required | Description                        |
|---------------------|----------|------------------------------------|
| `CHAT_DEMO_ENABLED` | Yes      | Enables chat demo routes (loopback only) |

### Table Schema

The `chat` table stores demo conversation messages.

| Column       | Type         | Description                |
|--------------|--------------|----------------------------|
| `id`         | BIGINT       | Primary key (auto-increment) |
| `case_id`    | VARCHAR(64)  | Reference to case          |
| `author`     | VARCHAR(128) | Message author             |
| `content`    | TEXT         | Message body               |
| `created_at` | TIMESTAMP    | Creation timestamp         |

## UI Polish Applied

### GavetaJuris Card Text

- Added `textoCard` helper that sentence-cases strings when >70% uppercase
- Deduplicates identical items in the render path (case-insensitive)
- Applies to both `resumo` and list items in Blindar/Quebrar/Fortalecer tabs

### CSS Improvements

- `.lista-limpa li`: increased padding (14px 18px), better line-height (1.55), proper word-wrap
- `.bloco-resumo`: added background, padding, rounded corners for visual consistency

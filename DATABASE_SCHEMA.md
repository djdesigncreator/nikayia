# Nikayia — Database Schema

Convenções: `id` = UUID (PK) em todas as tabelas. Timestamps `created_at`/`updated_at`
em todas as tabelas (omitidos abaixo por brevidade). FK = Foreign Key.

## User
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| bubble_user_id | string | referência ao registo no Bubble |
| email | string | único |
| username | string | único, indexado |
| role | enum | USER, CREATOR, MODERATOR, ADMIN, SUPER_ADMIN |
| is_private | boolean | default false |
| status | enum | ACTIVE, SUSPENDED, BANNED |

Índices: `username` (unique), `email` (unique), `bubble_user_id` (unique)

## Profile
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User, 1:1 |
| display_name | string | |
| bio | text | |
| avatar_url | string | Bunny CDN |
| location | string | opcional |
| is_verified | boolean | |

## Follow
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| follower_id | UUID | FK → User |
| following_id | UUID | FK → User |

Índices: composto `(follower_id, following_id)` unique; `following_id` (para listar seguidores rapidamente); `follower_id` (para listar seguindo).

## FollowRequest
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| requester_id | UUID | FK → User |
| target_id | UUID | FK → User |
| status | enum | PENDING, ACCEPTED, REJECTED |

Índice composto `(requester_id, target_id)` unique.

## Post
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| author_id | UUID | FK → User |
| type | enum | TEXT, IMAGE, VIDEO, CAROUSEL, LINK |
| caption | text | |
| location | string | opcional |
| visibility | enum | PUBLIC, FOLLOWERS, PRIVATE |
| likes_count | int | contador desnormalizado |
| comments_count | int | contador desnormalizado |
| shares_count | int | contador desnormalizado |

Índices: `author_id` + `created_at` (feed cronológico do autor); `created_at` (feed geral, cursor pagination).

## PostMedia
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| post_id | UUID | FK → Post |
| media_url | string | Bunny CDN |
| media_type | enum | IMAGE, VIDEO |
| order_index | int | para carrossel |

Índice: `post_id`.

## Like
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User |
| post_id | UUID | FK → Post, nullable |
| reel_id | UUID | FK → Reel, nullable |

Índice composto `(user_id, post_id)` unique; `(user_id, reel_id)` unique.

## Comment
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| post_id | UUID | FK → Post |
| author_id | UUID | FK → User |
| parent_comment_id | UUID | FK → Comment, nullable (respostas) |
| content | text | |
| likes_count | int | |

Índices: `post_id` + `created_at`; `parent_comment_id`.

## CommentLike
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User |
| comment_id | UUID | FK → Comment |

Índice composto `(user_id, comment_id)` unique.

## Share
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User |
| post_id | UUID | FK → Post |

Índice: `post_id`.

## SavedPost
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User |
| post_id | UUID | FK → Post |

Índice composto `(user_id, post_id)` unique.

## Story
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| author_id | UUID | FK → User |
| media_url | string | Bunny CDN |
| media_type | enum | IMAGE, VIDEO, TEXT |
| expires_at | timestamp | criado_em + 24h (configurável) |

Índice: `author_id` + `expires_at` (para limpeza/consulta de stories ativas).

## StoryView
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| story_id | UUID | FK → Story |
| viewer_id | UUID | FK → User |

Índice composto `(story_id, viewer_id)` unique.

## Reel
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| author_id | UUID | FK → User |
| video_url | string | Bunny CDN |
| thumbnail_url | string | Bunny CDN |
| caption | text | |
| views_count | int | |
| likes_count | int | |
| comments_count | int | |

Índices: `author_id`; `created_at` (feed de reels, cursor pagination).

## ReelView
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| reel_id | UUID | FK → Reel |
| viewer_id | UUID | FK → User |
| watch_time_ms | int | para o algoritmo de recomendação |

Índice: `reel_id`.

## Live
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| host_id | UUID | FK → User |
| title | string | |
| description | text | |
| category | string | |
| agora_channel_name | string | único |
| status | enum | SCHEDULED, LIVE, ENDED |
| viewers_count | int | contador em tempo real (cache, não persistido a cada segundo) |
| recording_url | string | Bunny CDN, nullable |

Índice: `status`; `host_id`.

## LiveParticipant
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| live_id | UUID | FK → Live |
| user_id | UUID | FK → User |
| role | enum | HOST, CO_HOST, VIEWER |

Índice composto `(live_id, user_id)` unique.

## LiveComment
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| live_id | UUID | FK → Live |
| user_id | UUID | FK → User |
| content | text | |

Índice: `live_id` + `created_at` (armazenamento opcional — pode viver só em memória/stream).

## Conversation
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| type | enum | DIRECT, GROUP (futuro) |

## ConversationParticipant (tabela de junção, não listada explicitamente mas necessária)
| Campo | Tipo | Notas |
|---|---|---|
| conversation_id | UUID | FK → Conversation |
| user_id | UUID | FK → User |

Índice composto `(conversation_id, user_id)` unique.

## Message
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| conversation_id | UUID | FK → Conversation |
| sender_id | UUID | FK → User |
| content | text | nullable se só media |
| media_url | string | Bunny CDN, nullable |
| status | enum | SENT, DELIVERED, SEEN |

Índice: `conversation_id` + `created_at` (cursor pagination do histórico).

## Notification
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| recipient_id | UUID | FK → User |
| actor_id | UUID | FK → User |
| type | enum | FOLLOW, FOLLOW_REQUEST, LIKE, COMMENT, REPLY, MENTION, SHARE, MESSAGE, LIVE_STARTED, LIVE_INVITE |
| entity_id | UUID | id do post/comment/live relacionado |
| is_read | boolean | default false |

Índice: `recipient_id` + `is_read` + `created_at`.

## Hashtag
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| tag | string | único, lowercase |
| usage_count | int | |

Índice: `tag` (unique); `usage_count` (para trending).

## PostHashtag (tabela de junção)
| Campo | Tipo | Notas |
|---|---|---|
| post_id | UUID | FK → Post |
| hashtag_id | UUID | FK → Hashtag |

## Report
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| reporter_id | UUID | FK → User |
| target_type | enum | POST, COMMENT, USER, LIVE |
| target_id | UUID | |
| category | enum | SPAM, ABUSE, ILLEGAL, HARASSMENT, FRAUD, OTHER |
| description | text | |
| status | enum | PENDING, REVIEWED, ACTIONED, DISMISSED |

Índice: `status` + `created_at`.

## Block
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User (quem bloqueia) |
| blocked_id | UUID | FK → User (quem é bloqueado) |

Índice composto `(user_id, blocked_id)` unique.

## Mute
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → User |
| muted_id | UUID | FK → User |

Índice composto `(user_id, muted_id)` unique.

## AdminAction
| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| admin_id | UUID | FK → User |
| action_type | enum | SUSPEND_USER, BAN_USER, REMOVE_POST, REMOVE_REEL, END_LIVE, REVIEW_REPORT |
| target_id | UUID | |
| notes | text | |

Índice: `admin_id` + `created_at`.

## Notas gerais
- Contadores (`likes_count`, `comments_count`, `views_count`, etc.) são
  **desnormalizados** para performance de leitura, atualizados via
  transação/trigger no momento da escrita — evita `COUNT(*)` em cada pedido de feed.
- Toda a listagem paginada (feed, reels, mensagens, notificações) usa
  **cursor pagination** baseada em `created_at` + `id`, nunca `OFFSET`.
- Relações de `Follow` nunca são resolvidas fazendo scan à tabela `User` —
  sempre via os índices da própria tabela `Follow`.

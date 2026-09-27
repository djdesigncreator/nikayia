# Nikayia — API Specification

Base URL: `/api`
Autenticação: `Authorization: Bearer <jwt>` (emitido pelo Bubble, validado pelo backend)

## Formato de resposta padrão

Sucesso:
```json
{ "success": true, "data": { }, "error": null }
```

Erro:
```json
{ "success": false, "data": null, "error": { "code": "INVALID_REQUEST", "message": "Descrição do erro" } }
```

Paginação (cursor):
```json
{ "success": true, "data": { "items": [], "next_cursor": "eyJjcmVhdGVkX2F0IjoiLi4uIn0=" }, "error": null }
```

---

## /api/auth
| Método | Rota | Descrição | Role |
|---|---|---|---|
| POST | /auth/verify | Valida o token emitido pelo Bubble e devolve o perfil | público |
| POST | /auth/refresh | Renova o token de sessão | autenticado |

## /api/users
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /users/me | Perfil do utilizador autenticado | autenticado |
| PATCH | /users/me | Editar perfil (nome, bio, avatar, localização, privacidade) | autenticado |
| GET | /users/:id | Perfil público de um utilizador | autenticado |
| GET | /users/:id/posts | Publicações do utilizador | autenticado |
| GET | /users/:id/reels | Reels do utilizador | autenticado |
| GET | /users/:id/followers | Lista de seguidores (cursor) | autenticado |
| GET | /users/:id/following | Lista de quem segue (cursor) | autenticado |
| POST | /users/:id/follow | Seguir / pedir para seguir | autenticado |
| DELETE | /users/:id/follow | Deixar de seguir | autenticado |
| POST | /users/:id/block | Bloquear utilizador | autenticado |
| DELETE | /users/:id/block | Desbloquear | autenticado |
| POST | /users/:id/mute | Silenciar | autenticado |

## /api/follow-requests
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /follow-requests | Pedidos pendentes recebidos | autenticado |
| POST | /follow-requests/:id/accept | Aceitar pedido | autenticado |
| POST | /follow-requests/:id/reject | Recusar pedido | autenticado |

## /api/feed
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /feed?cursor=&limit= | Feed principal (algoritmo de relevância) | autenticado |
| GET | /feed/following?cursor= | Feed cronológico só de quem segue | autenticado |

## /api/posts
| Método | Rota | Descrição | Role |
|---|---|---|---|
| POST | /posts | Criar publicação (texto/imagem/vídeo/carrossel) | autenticado |
| GET | /posts/:id | Detalhe da publicação | autenticado |
| DELETE | /posts/:id | Eliminar publicação própria | autor |
| POST | /posts/:id/like | Gostar | autenticado |
| DELETE | /posts/:id/like | Retirar gosto | autenticado |
| POST | /posts/:id/save | Guardar | autenticado |
| DELETE | /posts/:id/save | Remover dos guardados | autenticado |
| POST | /posts/:id/share | Registar partilha | autenticado |
| POST | /posts/:id/report | Denunciar | autenticado |

## /api/reels
| Método | Rota | Descrição | Role |
|---|---|---|---|
| POST | /reels | Criar reel (após upload no Bunny) | CREATOR/USER |
| GET | /reels?cursor= | Feed vertical de reels | autenticado |
| GET | /reels/:id | Detalhe do reel | autenticado |
| POST | /reels/:id/view | Registar visualização/tempo assistido | autenticado |
| POST | /reels/:id/like | Gostar | autenticado |
| DELETE | /reels/:id | Eliminar reel próprio | autor |

## /api/stories
| Método | Rota | Descrição | Role |
|---|---|---|---|
| POST | /stories | Criar story | autenticado |
| GET | /stories/feed | Stories de quem sigo, agrupadas por autor | autenticado |
| POST | /stories/:id/view | Marcar como vista | autenticado |
| GET | /stories/:id/viewers | Lista de quem viu (só o autor) | autor |
| DELETE | /stories/:id | Eliminar story própria | autor |

## /api/lives
| Método | Rota | Descrição | Role |
|---|---|---|---|
| POST | /lives | Criar/agendar live (gera canal + token Agora) | CREATOR |
| POST | /lives/:id/start | Iniciar transmissão | host |
| POST | /lives/:id/end | Encerrar transmissão | host |
| POST | /lives/:id/join | Entrar como espectador (gera token Agora de viewer) | autenticado |
| POST | /lives/:id/invite-cohost | Convidar co-host | host |
| DELETE | /lives/:id/participants/:userId | Remover/bloquear participante | host |
| GET | /lives/active | Lives atualmente ao vivo | autenticado |
| POST | /lives/:id/comments | Comentar na live | autenticado |

## /api/comments
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /posts/:postId/comments?cursor= | Listar comentários | autenticado |
| POST | /posts/:postId/comments | Criar comentário/resposta | autenticado |
| DELETE | /comments/:id | Eliminar comentário próprio | autor |
| POST | /comments/:id/like | Gostar comentário | autenticado |
| POST | /comments/:id/report | Denunciar comentário | autenticado |

## /api/messages
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /conversations | Lista de conversas do utilizador | autenticado |
| POST | /conversations | Iniciar conversa 1:1 | autenticado |
| GET | /conversations/:id/messages?cursor= | Histórico de mensagens | participante |
| POST | /conversations/:id/messages | Enviar mensagem (texto/imagem/vídeo) | participante |
| PATCH | /messages/:id/seen | Marcar como vista | participante |

## /api/notifications
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /notifications?cursor=&unread= | Listar notificações | autenticado |
| PATCH | /notifications/:id/read | Marcar como lida | autenticado |
| PATCH | /notifications/read-all | Marcar todas como lidas | autenticado |

## /api/search
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /search?q=&type= | Pesquisa global (users, hashtags, posts, reels) com debounce no frontend | autenticado |

## /api/hashtags
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /hashtags/:tag | Publicações/reels com a hashtag | autenticado |
| GET | /hashtags/trending | Hashtags em alta | autenticado |

## /api/explore
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /explore?cursor= | Conteúdo recomendado (grelha) | autenticado |

## /api/reports (moderação)
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /reports?status= | Listar denúncias | MODERATOR/ADMIN |
| PATCH | /reports/:id | Atualizar estado / ação tomada | MODERATOR/ADMIN |

## /api/admin
| Método | Rota | Descrição | Role |
|---|---|---|---|
| GET | /admin/stats | Estatísticas gerais da plataforma | ADMIN/SUPER_ADMIN |
| PATCH | /admin/users/:id/suspend | Suspender utilizador | ADMIN |
| PATCH | /admin/users/:id/ban | Banir utilizador | ADMIN/SUPER_ADMIN |
| DELETE | /admin/posts/:id | Remover publicação | MODERATOR/ADMIN |
| DELETE | /admin/reels/:id | Remover reel | MODERATOR/ADMIN |
| POST | /admin/lives/:id/end | Encerrar live remotamente | MODERATOR/ADMIN |

## /api/media (serviços internos)
| Método | Rota | Descrição | Role |
|---|---|---|---|
| POST | /media/upload-url | Gera URL assinada de upload para o Bunny.net | autenticado |
| POST | /media/agora-token | Gera token Agora para um canal específico | autenticado |

### Códigos de erro comuns
| Código | Significado |
|---|---|
| `UNAUTHORIZED` | Token ausente ou inválido |
| `FORBIDDEN` | Sem permissão (role insuficiente) |
| `NOT_FOUND` | Recurso não existe |
| `VALIDATION_ERROR` | Input inválido |
| `RATE_LIMITED` | Demasiados pedidos |
| `CONFLICT` | Ex.: pedido de seguimento duplicado |

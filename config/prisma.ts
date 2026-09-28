import { PrismaClient } from '@prisma/client';

// Uma única instância partilhada por todo o backend (evita abrir dezenas de ligações à BD).
export const prisma = new PrismaClient();

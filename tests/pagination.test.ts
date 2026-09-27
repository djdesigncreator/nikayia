import { encodeCursor, decodeCursor } from '../utils/pagination';

describe('cursor pagination', () => {
  it('codifica e descodifica um cursor sem perder dados', () => {
    const cursor = { createdAt: '2026-09-26T10:00:00.000Z', id: 'abc-123' };
    const encoded = encodeCursor(cursor);
    const decoded = decodeCursor(encoded);
    expect(decoded).toEqual(cursor);
  });

  it('devolve null para um cursor inválido ou ausente', () => {
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor('não-é-base64-válido!!')).toBeNull();
  });
});

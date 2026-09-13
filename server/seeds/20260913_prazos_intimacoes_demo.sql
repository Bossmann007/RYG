-- Fictional judicial-notice examples. Never imported notices or verified legal deadlines.

-- Weekdays only: holidays and court suspensions are deliberately not modeled.

-- Snapshot: 2026-09-13. Status values are demonstration data, not a live clock.

-- Idempotent for this seed marker and title. Execute in one transaction.

START TRANSACTION;

INSERT INTO prazos (processo_id, titulo, tipo, data_vencimento, data_inicio, quantidade_dias, contagem, status, responsavel, gatilho, gatilho_fonte, observacoes)
SELECT p.id, 'Responder à intimação judicial', 'manifestacao', '2026-09-08', '2026-09-01', 5, 'uteis', 'vencido', 'Equipe jurídica — demonstração', 'Intimação judicial simulada para prestar esclarecimentos sobre os pontos indicados pelo juízo.', 'acervo_interno', '[DEMO_PRAZOS_INTIMACAO_V1] Dados fictícios para demonstração; não representam intimação recebida do Judiciário. Datas simuladas com segunda a sexta, sem feriados ou suspensões; não utilizar como prazo judicial real.'
FROM processos p
WHERE NOT EXISTS (
  SELECT 1 FROM prazos existing
  WHERE existing.processo_id = p.id AND existing.titulo = 'Responder à intimação judicial'
    AND existing.observacoes LIKE '[DEMO_PRAZOS_INTIMACAO_V1]%'
);

INSERT INTO prazos (processo_id, titulo, tipo, data_vencimento, data_inicio, quantidade_dias, contagem, status, responsavel, gatilho, gatilho_fonte, observacoes)
SELECT p.id, 'Juntar documentos solicitados pelo juízo', 'prova', '2026-09-16', '2026-09-02', 10, 'uteis', 'a_vencer', 'Equipe jurídica — demonstração', 'Intimação judicial simulada para juntar os documentos solicitados pelo juízo.', 'acervo_interno', '[DEMO_PRAZOS_INTIMACAO_V1] Dados fictícios para demonstração; não representam intimação recebida do Judiciário. Datas simuladas com segunda a sexta, sem feriados ou suspensões; não utilizar como prazo judicial real.'
FROM processos p
WHERE NOT EXISTS (
  SELECT 1 FROM prazos existing
  WHERE existing.processo_id = p.id AND existing.titulo = 'Juntar documentos solicitados pelo juízo'
    AND existing.observacoes LIKE '[DEMO_PRAZOS_INTIMACAO_V1]%'
);

INSERT INTO prazos (processo_id, titulo, tipo, data_vencimento, data_inicio, quantidade_dias, contagem, status, responsavel, gatilho, gatilho_fonte, observacoes)
SELECT p.id, 'Especificar as provas pretendidas', 'prova', '2026-10-01', '2026-09-10', 15, 'uteis', 'aberto', 'Equipe jurídica — demonstração', 'Intimação judicial simulada para especificar as provas pretendidas e justificar sua pertinência.', 'acervo_interno', '[DEMO_PRAZOS_INTIMACAO_V1] Dados fictícios para demonstração; não representam intimação recebida do Judiciário. Datas simuladas com segunda a sexta, sem feriados ou suspensões; não utilizar como prazo judicial real.'
FROM processos p
WHERE NOT EXISTS (
  SELECT 1 FROM prazos existing
  WHERE existing.processo_id = p.id AND existing.titulo = 'Especificar as provas pretendidas'
    AND existing.observacoes LIKE '[DEMO_PRAZOS_INTIMACAO_V1]%'
);

INSERT INTO prazos (processo_id, titulo, tipo, data_vencimento, data_inicio, quantidade_dias, contagem, status, responsavel, gatilho, gatilho_fonte, observacoes)
SELECT p.id, 'Manifestar-se sobre documento juntado', 'manifestacao', '2026-09-04', '2026-08-14', 15, 'uteis', 'cumprido', 'Equipe jurídica — demonstração', 'Intimação judicial simulada para apresentar manifestação sobre documento juntado aos autos.', 'acervo_interno', '[DEMO_PRAZOS_INTIMACAO_V1] Dados fictícios para demonstração; não representam intimação recebida do Judiciário. Datas simuladas com segunda a sexta, sem feriados ou suspensões; não utilizar como prazo judicial real. Cumprimento fictício registrado apenas para demonstrar o filtro da tela.'
FROM processos p
WHERE NOT EXISTS (
  SELECT 1 FROM prazos existing
  WHERE existing.processo_id = p.id AND existing.titulo = 'Manifestar-se sobre documento juntado'
    AND existing.observacoes LIKE '[DEMO_PRAZOS_INTIMACAO_V1]%'
);

COMMIT;

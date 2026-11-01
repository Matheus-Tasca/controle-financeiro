export class ThirdPartyDebtsSchema20261031000000 {
  name = 'ThirdPartyDebtsSchema20261031000000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS TERCEIROS (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY ix_terceiros_user_id (user_id),
        UNIQUE KEY uq_terceiros_user_nome (user_id, nome),
        CONSTRAINT fk_terceiros_usuario
          FOREIGN KEY (user_id) REFERENCES USUARIOS (id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS LANCAMENTOS_TERCEIROS (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        terceiro_id VARCHAR(36) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        data DATE NOT NULL,
        valor_total INT NOT NULL,
        total_parcelas INT NOT NULL,
        id_cartao VARCHAR(36) NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY ix_lancamentos_terceiros_user (user_id),
        KEY ix_lancamentos_terceiros_terceiro (terceiro_id),
        KEY ix_lancamentos_terceiros_cartao (id_cartao),
        CONSTRAINT fk_lancamentos_terceiros_user
          FOREIGN KEY (user_id) REFERENCES USUARIOS (id)
          ON DELETE CASCADE,
        CONSTRAINT fk_lancamentos_terceiros_terceiro
          FOREIGN KEY (terceiro_id) REFERENCES TERCEIROS (id)
          ON DELETE RESTRICT,
        CONSTRAINT fk_lancamentos_terceiros_cartao
          FOREIGN KEY (id_cartao) REFERENCES CARTOES (id)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS PARCELAS_TERCEIROS (
        id VARCHAR(36) NOT NULL,
        lancamento_id VARCHAR(36) NOT NULL,
        numero_parcela INT NOT NULL,
        total_parcelas INT NOT NULL,
        valor INT NOT NULL,
        vencimento DATE NOT NULL,
        pago BOOLEAN NOT NULL DEFAULT FALSE,
        data_pagamento DATE NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY ix_parcelas_terceiros_lancamento (lancamento_id),
        KEY ix_parcelas_terceiros_vencimento (vencimento),
        KEY ix_parcelas_terceiros_pago (pago),
        CONSTRAINT fk_parcelas_terceiros_lancamento
          FOREIGN KEY (lancamento_id) REFERENCES LANCAMENTOS_TERCEIROS (id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner) {
    await queryRunner.query('DROP TABLE IF EXISTS PARCELAS_TERCEIROS');
    await queryRunner.query('DROP TABLE IF EXISTS LANCAMENTOS_TERCEIROS');
    await queryRunner.query('DROP TABLE IF EXISTS TERCEIROS');
  }
}

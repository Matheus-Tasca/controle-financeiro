export class AddInvestmentTables20261028000000 {
  name = 'AddInvestmentTables20261028000000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS BANCOS_INVESTIMENTO (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        saldo_atual BIGINT NOT NULL DEFAULT 0,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY ix_bancos_investimento_user_id (user_id),
        CONSTRAINT fk_bancos_investimento_usuario
          FOREIGN KEY (user_id) REFERENCES USUARIOS (id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS MOVIMENTACOES_INVESTIMENTO (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        id_banco VARCHAR(36) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        valor_movimentado BIGINT NOT NULL,
        saldo_anterior BIGINT NOT NULL,
        saldo_novo BIGINT NOT NULL,
        data DATE NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY ix_movimentacoes_investimento_user_id (user_id),
        KEY ix_movimentacoes_investimento_banco_id (id_banco),
        KEY ix_movimentacoes_investimento_data (data),
        CONSTRAINT fk_movimentacoes_investimento_usuario
          FOREIGN KEY (user_id) REFERENCES USUARIOS (id)
          ON DELETE CASCADE,
        CONSTRAINT fk_movimentacoes_investimento_banco
          FOREIGN KEY (id_banco) REFERENCES BANCOS_INVESTIMENTO (id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS MOVIMENTACOES_INVESTIMENTO`);
    await queryRunner.query(`DROP TABLE IF EXISTS BANCOS_INVESTIMENTO`);
  }
}


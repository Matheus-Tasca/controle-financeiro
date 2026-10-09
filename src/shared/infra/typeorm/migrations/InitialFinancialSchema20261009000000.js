export class InitialFinancialSchema20261009000000 {
  name = 'InitialFinancialSchema20261009000000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS USUARIOS (
        id VARCHAR(36) NOT NULL,
        usuario VARCHAR(100) NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_usuarios_usuario (usuario),
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS CATEGORIAS_LANCAMENTOS (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        PRIMARY KEY (id),
        KEY ix_categorias_user_id (user_id),
        CONSTRAINT fk_categorias_usuario
          FOREIGN KEY (user_id) REFERENCES USUARIOS (id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS CARTOES (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        dia_fechamento INT NOT NULL,
        dia_vencimento INT NOT NULL,
        ativo BOOLEAN NOT NULL DEFAULT TRUE,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NULL DEFAULT NULL,
        PRIMARY KEY (id),
        KEY ix_cartoes_user_id (user_id),
        CONSTRAINT fk_cartoes_usuario
          FOREIGN KEY (user_id) REFERENCES USUARIOS (id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS METODO_PAGAMENTO (
        id VARCHAR(50) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_metodo_pagamento_nome (nome)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO METODO_PAGAMENTO (id, nome) VALUES
        ('cartao_credito', 'Cartão de Crédito'),
        ('cartao_debito', 'Cartão de Débito'),
        ('dinheiro', 'Dinheiro'),
        ('pix', 'Pix')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS TRANSACOES (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        id_categoria VARCHAR(36) NOT NULL,
        tipo_transacao VARCHAR(255) NOT NULL,
        data DATE NOT NULL,
        id_metodo_pagamento VARCHAR(50) NOT NULL,
        id_cartao VARCHAR(36) NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY ix_transacoes_user_id (user_id),
        KEY ix_transacoes_categoria (id_categoria),
        KEY ix_transacoes_metodo_pagamento (id_metodo_pagamento),
        KEY ix_transacoes_cartao (id_cartao),
        CONSTRAINT fk_transacoes_usuario
          FOREIGN KEY (user_id) REFERENCES USUARIOS (id)
          ON DELETE CASCADE,
        CONSTRAINT fk_transacoes_categoria
          FOREIGN KEY (id_categoria) REFERENCES CATEGORIAS_LANCAMENTOS (id),
        CONSTRAINT fk_transacoes_metodo_pagamento
          FOREIGN KEY (id_metodo_pagamento) REFERENCES METODO_PAGAMENTO (id),
        CONSTRAINT fk_transacoes_cartao
          FOREIGN KEY (id_cartao) REFERENCES CARTOES (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS PARCELAS (
        id_parcela VARCHAR(36) NOT NULL,
        valor INT NOT NULL,
        id_transacao VARCHAR(36) NOT NULL,
        numero_parcela INT NOT NULL,
        total_parcelas INT NOT NULL,
        vencimento DATE NOT NULL,
        criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id_parcela),
        KEY ix_parcelas_transacao (id_transacao),
        KEY ix_parcelas_vencimento (vencimento),
        CONSTRAINT fk_parcelas_transacao
          FOREIGN KEY (id_transacao) REFERENCES TRANSACOES (id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner) {
    await queryRunner.query('DROP TABLE IF EXISTS PARCELAS');
    await queryRunner.query('DROP TABLE IF EXISTS TRANSACOES');
    await queryRunner.query('DROP TABLE IF EXISTS METODO_PAGAMENTO');
    await queryRunner.query('DROP TABLE IF EXISTS CARTOES');
    await queryRunner.query('DROP TABLE IF EXISTS CATEGORIAS_LANCAMENTOS');
    await queryRunner.query('DROP TABLE IF EXISTS USUARIOS');
  }
}

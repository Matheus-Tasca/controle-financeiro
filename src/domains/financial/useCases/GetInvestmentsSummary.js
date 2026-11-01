export class GetInvestmentsSummaryUseCase {
  constructor(bankRepository, movementRepository) {
    this.bankRepository = bankRepository;
    this.movementRepository = movementRepository;
  }

  async execute({ userId, startDate, endDate }) {
    // Busca todos os bancos ativos do usuário
    const banks = await this.bankRepository.findAll(userId, {
      activeOnly: true,
    });

    const totalCurrentBalance = banks.reduce(
      (sum, b) => sum + (Number(b.currentBalance) || 0),
      0
    );

    // Se datas não forem fornecidas, define padrão dos últimos 90 dias
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(end.getDate() - 90));

    const formattedStartDate = start.toISOString().split('T')[0];
    const formattedEndDate = end.toISOString().split('T')[0];

    // Busca todas as movimentações até a data final do período
    const allMovements = await this.movementRepository.findAllUpToDate(
      userId,
      formattedEndDate
    );

    // Gera lista ordenada de meses no formato 'YYYY-MM'
    const months = this.getMonthsRange(formattedStartDate, formattedEndDate);

    // Para cada banco, calcula o saldo acumulado no fechamento de cada mês
    const bankMonthlyEvolution = {};
    for (const bank of banks) {
      bankMonthlyEvolution[bank.id] = {
        bankId: bank.id,
        bankName: bank.name,
        history: [],
      };
    }

    // Calcula evolução mensal por banco
    const totalMonthlyEvolution = [];

    for (const monthStr of months) {
      // Último dia do mês ou a data final (se for o mês corrente)
      const lastDayOfMonth = this.getLastDayOfMonth(monthStr);
      const cutoffDate =
        lastDayOfMonth > formattedEndDate ? formattedEndDate : lastDayOfMonth;

      let monthTotal = 0;

      for (const bank of banks) {
        // Encontra a movimentação mais recente deste banco até cutoffDate
        const movementsForBank = allMovements.filter(
          (m) => m.bankId === bank.id && m.date <= cutoffDate
        );

        let bankBalanceAtMonth = 0;
        if (movementsForBank.length > 0) {
          // Última movimentação até a data de corte
          const latest = movementsForBank[movementsForBank.length - 1];
          bankBalanceAtMonth = Number(latest.newBalance) || 0;
        }

        monthTotal += bankBalanceAtMonth;

        bankMonthlyEvolution[bank.id].history.push({
          month: monthStr,
          label: this.formatMonthLabel(monthStr),
          balance: bankBalanceAtMonth,
        });
      }

      totalMonthlyEvolution.push({
        month: monthStr,
        label: this.formatMonthLabel(monthStr),
        totalBalance: monthTotal,
      });
    }

    return {
      banks: banks.map((b) => ({
        id: b.id,
        name: b.name,
        currentBalance: Number(b.currentBalance) || 0,
        active: b.active,
      })),
      totalCurrentBalance,
      period: {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
      },
      totalMonthlyEvolution,
      bankMonthlyEvolution,
    };
  }

  getMonthsRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = [];

    const current = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)
    );
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

    while (current <= last) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      months.push(`${year}-${month}`);
      current.setUTCMonth(current.getUTCMonth() + 1);
    }

    return months;
  }

  getLastDayOfMonth(monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    // Dia 0 do próximo mês é o último dia do mês atual
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  }

  formatMonthLabel(monthStr) {
    const [year, month] = monthStr.split('-');
    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]}/${year.slice(2)}`;
  }
}

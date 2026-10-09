/* Datas visíveis em DD/MM/AAAA; a API continua recebendo AAAA-MM-DD. */
(function () {
  const pad = (value) => String(value).padStart(2, '0');

  function toISO(value) {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day)
    ) {
      return null;
    }

    return `${year}-${month}-${day}`;
  }

  function today() {
    const date = new Date();
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  function todayISO() {
    const date = new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function maskInput(input) {
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '').slice(0, 8);
      if (digits.length <= 2) {
        input.value = digits;
      } else if (digits.length <= 4) {
        input.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      } else {
        input.value = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      }
    });
  }

  window.BrazilianDate = { toISO, today, todayISO, maskInput };
})();

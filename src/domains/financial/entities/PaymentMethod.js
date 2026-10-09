export class PaymentMethod {
  constructor({ id, description, active } = {}) {
    this.id = id;
    this.description = description;
    this.active = active ?? true;
  }
}

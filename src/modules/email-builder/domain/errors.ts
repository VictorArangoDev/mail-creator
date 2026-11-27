export class TemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateValidationError';
  }
}

export class TemplateNotFoundError extends Error {
  constructor(id: number) {
    super(`No existe la plantilla con id ${id}`);
    this.name = 'TemplateNotFoundError';
  }
}

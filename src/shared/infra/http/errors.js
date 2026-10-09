export function sendInternalError(req, res, error, operation) {
  console.error('Request failed', {
    requestId: req.requestId,
    operation,
    name: error?.name,
    code: error?.code,
  });
  return res.status(500).json({
    error: 'Erro interno do servidor',
    requestId: req.requestId,
  });
}

export function sendPublicError(req, res, error, options = {}) {
  const { status = 400, messages = [], operation = 'request' } = options;
  if (messages.includes(error?.message)) {
    return res.status(status).json({ error: error.message });
  }
  return sendInternalError(req, res, error, operation);
}

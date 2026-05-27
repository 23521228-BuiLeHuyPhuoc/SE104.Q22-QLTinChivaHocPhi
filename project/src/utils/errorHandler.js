const SQLSTATE_STATUS = {
  P0001: 400,
  '22001': 400,
  '22003': 400,
  '23502': 400,
  '23503': 409,
  '23505': 409,
  '23514': 400
};

const PRISMA_STATUS = {
  P2000: 400,
  P2002: 409,
  P2003: 409,
  P2010: 400,
  P2025: 404
};

const decodeQuotedText = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const cleanMessage = (value) => {
  if (!value) return '';
  return decodeQuotedText(value)
    .replace(/^ERROR:\s*/i, '')
    .replace(/^Error occurred during query execution:\s*/i, '')
    .replace(/^Raw query failed\.\s*Code:\s*`?[^`.\s]+`?\.\s*Message:\s*/i, '')
    .trim();
};

const getErrorText = (error) => {
  if (!error) return '';
  const pieces = [
    error.message,
    error.meta?.message,
    error.meta?.database_error,
    error.meta?.cause,
    error.cause?.message
  ];
  return pieces.filter(Boolean).map(String).join('\n');
};

const extractPostgresError = (error) => {
  if (!error) return null;

  const text = getErrorText(error);
  const code = (
    error.meta?.code ||
    error.meta?.database_error_code ||
    error.code
  );

  const pgCodeMatch =
    text.match(/PostgresError\s*\{\s*code:\s*"([^"]+)"/i) ||
    text.match(/SQLSTATE\s*\[?([A-Z0-9]{5})\]?/i) ||
    text.match(/Code:\s*`?([A-Z0-9]{5})`?/i);

  const pgMessageMatch =
    text.match(/PostgresError\s*\{[^}]*message:\s*"((?:\\"|[^"])*)"/i) ||
    text.match(/ERROR:\s*([^\n]+)/i) ||
    text.match(/Message:\s*`?([^`\n]+)`?/i);

  const codeCandidate = String(code || '');
  const codeLooksLikeSqlState =
    codeCandidate === 'P0001' ||
    (/^[0-9A-Z]{5}$/.test(codeCandidate) && !/^P\d{4}$/.test(codeCandidate));
  const sqlState = pgCodeMatch?.[1] || (codeLooksLikeSqlState ? codeCandidate : null);
  const message = cleanMessage(error.meta?.message || pgMessageMatch?.[1] || '');

  if (!sqlState && !message) return null;
  return { sqlState, message };
};

const formatPrismaMessage = (error) => {
  if (error.code === 'P2000') return 'Du lieu vuot qua do dai cho phep';
  if (error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : error.meta?.target;
    return target ? `Du lieu da ton tai: ${target}` : 'Du lieu da ton tai';
  }
  if (error.code === 'P2003') return 'Du lieu dang tham chieu khong hop le hoac dang duoc su dung';
  if (error.code === 'P2025') return 'Khong tim thay du lieu can thao tac';
  return '';
};

const formatSqlStateMessage = (sqlState, message) => {
  if (message) return message;
  if (sqlState === 'P0001') return 'Du lieu khong thoa rang buoc trigger SQL';
  if (sqlState === '23505') return 'Du lieu da ton tai';
  if (sqlState === '23503') return 'Du lieu dang tham chieu khong hop le hoac dang duoc su dung';
  if (sqlState === '23514') return 'Du lieu khong thoa rang buoc kiem tra';
  if (sqlState === '23502') return 'Vui long nhap day du thong tin bat buoc';
  if (sqlState === '22001') return 'Du lieu vuot qua do dai cho phep';
  if (sqlState === '22003') return 'Gia tri so vuot qua gioi han cho phep';
  return 'Loi rang buoc co so du lieu';
};

const buildErrorResponse = (error, fallbackMessage = 'Loi server') => {
  const fallback = typeof fallbackMessage === 'function' ? fallbackMessage(error) : fallbackMessage;

  if (error?.status && error?.message) {
    return {
      status: error.status,
      message: error.message,
      code: error.code || 'APP_ERROR',
      isOperational: true
    };
  }

  const postgresError = extractPostgresError(error);
  if (postgresError?.sqlState) {
    const isTriggerError = postgresError.sqlState === 'P0001' || /trigger|trg_|raise exception/i.test(getErrorText(error));
    return {
      status: SQLSTATE_STATUS[postgresError.sqlState] || 400,
      message: formatSqlStateMessage(postgresError.sqlState, postgresError.message),
      code: isTriggerError ? 'SQL_TRIGGER_ERROR' : 'SQL_CONSTRAINT_ERROR',
      sqlState: postgresError.sqlState,
      isOperational: true
    };
  }

  if (error?.code && PRISMA_STATUS[error.code]) {
    const message = formatPrismaMessage(error) || cleanMessage(error.message) || fallback;
    return {
      status: PRISMA_STATUS[error.code],
      message,
      code: error.code,
      isOperational: true
    };
  }

  return {
    status: 500,
    message: fallback || 'Loi server',
    code: 'INTERNAL_SERVER_ERROR',
    isOperational: false
  };
};

const sendErrorResponse = (res, error, fallbackMessage = 'Loi server', context = 'Request error') => {
  const response = buildErrorResponse(error, fallbackMessage);
  console.error(`${context}:`, error);

  if (res.headersSent) return false;

  const payload = {
    success: false,
    message: response.message
  };

  if (response.code) payload.code = response.code;
  if (response.sqlState) payload.sqlState = response.sqlState;

  res.status(response.status).json(payload);
  return true;
};

const isSqlTriggerError = (error) => {
  const response = buildErrorResponse(error);
  return response.code === 'SQL_TRIGGER_ERROR';
};

module.exports = {
  buildErrorResponse,
  sendErrorResponse,
  isSqlTriggerError
};

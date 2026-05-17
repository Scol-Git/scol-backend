'use strict';

exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'scol-backend'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY || '',
  agent_enabled: !!process.env.NEW_RELIC_LICENSE_KEY,

  logging: {
    level: 'info',
    filepath: 'stdout',
  },

  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000,
    },
    local_decorating: {
      enabled: false,
    },
    metrics: {
      enabled: true,
    },
  },

  distributed_tracing: {
    enabled: true,
  },

  transaction_tracer: {
    enabled: true,
    transaction_threshold: 200,
    record_sql: 'obfuscated',
  },

  error_collector: {
    enabled: true,
    ignore_status_codes: [401, 404],
  },
};

'use strict'

exports.config = {
  app_name: ['Eboxtickets'],

  license_key: 'cff5b90176e9b7ebbf2740fca2cb2db3aa79NRAL',

  logging: {
    level: 'info'
  },

  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true
    },
    metrics: {
      enabled: true
    }
  },

  instrumentation: {
    timers: {
      enabled: false
    }
  },

  allow_all_headers: true,

  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  }
}
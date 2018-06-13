// @flow
import commands from 'commands'
import logger from 'logger'
import uuid from 'uuid/v4'
import { setImplementation } from 'api/network'
import sentry from 'sentry/node'

require('../env')

process.title = 'Internal'

const defers = {}

let sentryEnabled = process.env.INITIAL_SENTRY_ENABLED || false

sentry(() => sentryEnabled, process.env.SENTRY_USER_ID)

if (process.env.DEBUG_NETWORK) {
  setImplementation(networkArg => {
    const id = uuid()
    return new Promise((resolve, reject) => {
      process.send({
        type: 'executeHttpQueryOnRenderer',
        networkArg,
        id,
      })
      defers[id] = {
        resolve: r => {
          resolve(r)
          delete defers[id]
        },
        reject: e => {
          reject(e)
          delete defers[id]
        },
      }
    })
  })
}

const subscriptions = {}

process.on('message', m => {
  if (m.type === 'command') {
    const { data, requestId, id } = m.command
    const cmd = commands.find(cmd => cmd.id === id)
    if (!cmd) {
      logger.warn(`command ${id} not found`)
      return
    }
    subscriptions[requestId] = cmd.impl(data).subscribe({
      next: data => {
        process.send({
          type: 'cmd.NEXT',
          requestId,
          data,
        })
      },
      complete: () => {
        delete subscriptions[requestId]
        process.send({
          type: 'cmd.COMPLETE',
          requestId,
        })
      },
      error: error => {
        logger.warn('Command error:', error)
        delete subscriptions[requestId]
        process.send({
          type: 'cmd.ERROR',
          requestId,
          data: {
            ...error,
            name: error && error.name,
            message: error && error.message,
          },
        })
      },
    })
  } else if (m.type === 'command-unsubscribe') {
    const { requestId } = m
    const sub = subscriptions[requestId]
    if (sub) {
      sub.unsubscribe()
      delete subscriptions[requestId]
    }
  } else if (m.type === 'executeHttpQueryPayload') {
    const { payload } = m
    const defer = defers[payload.id]
    if (!defer) {
      logger.warn('executeHttpQueryPayload: no defer found')
      return
    }
    if (payload.type === 'success') {
      defer.resolve(payload.result)
    } else {
      defer.reject(payload.error)
    }
  } else if (m.type === 'sentryLogsChanged') {
    const { payload } = m
    sentryEnabled = payload.value
  }
})

logger.log('Internal process is up!')

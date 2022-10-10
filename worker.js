import { get } from 'lodash'

export const api = {
  icon: '👌',
  name: 'kvdb.do',
  description: 'Simple KV-based Database',
  url: 'https://kvdb.do/api',
  type: 'https://apis.do/database',
  endpoints: {
    pluckFromURL: 'https://kvdb.do/:property/:url',
    pluckFromPOST: 'https://kvdb.do/:property',
  },
  site: 'https://kvdb.do',
  login: 'https://kvdb.do/login',
  signup: 'https://kvdb.do/signup',
  repo: 'https://github.com/drivly/kvdb.do',
}

export const gettingStarted = [
  `If you don't already have a JSON Viewer Browser Extension, get that first:`,
  `https://extensions.do`,
]

export const examples = {
  listItems: 'https://templates.do/worker',
}

const database = {}

export default {
  fetch: async (req, env) => {
    const { user, method, origin, hostname, pathname, rootPath, pathSegments, query } = await env.CTX.fetch(req).then(res => res.json())
    try {
      // if (rootPath) return json({ api, gettingStarted, examples, user })
      if (!database[hostname]) database[hostname] = await env.KVDB.get(hostname, { type: 'json' })
      if (!user.authenticated) return Response.redirect(origin + '/login')

      if (method != 'GET') return env.KBDO.get(env.KBDO.idFromName(hostname)).fetch(req)

      // TODO: Implement this
      const [ resource, id ] = pathSegments

      const data = resource ? (id ? database[hostname][resource][id] : database[hostname][resource]) : Object.keys(database[hostname]).reduce((acc, v) => ({...acc, [v]: `${origin}/${v}`}), {})

      return json({ api, data, user })
    } catch ({name, message, stack}) {
      return json({ error: {name, message, stack} })
    }
  }
}

export class KVDO {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.database = {}
  }
  async save() {
    let error, delay, success = undefined
    while (!success && delay < 64000) {
      try {
        success = await this.env.KVDB.put(this.hostname, JSON.stringify(this.database[this.hostname]))
      } catch ({name, message, stack}) {
        error = {name, message, stack}
        delay = delay ? delay * 2 : 1000
        console.log({error, delay})
        await sleep(delay)
      }
    }
  }
  async fetch(req) {
    try {
      const { user, method, hostname, pathname, rootPath, pathSegments, query, body } = await env.CTX.fetch(req).then(res => res.json())
      if (!this.hostname) this.hostname = hostname
      if (!this.database[hostname]) this.database[hostname] = await this.env.KVDB.get(hostname, { type: 'json' }) ?? {}

      const [ resource, id ] = pathSegments

      if (!this.database[resource]) this.database[resource] = []
      const index = this.database[hostname][resource].findIndex(item => item.id == id)

      if (method == 'POST') this.database[hostname][resource].push({ id: id ?? generateId, ...body })
      if (method == 'PUT') this.database[hostname][resource][index] = { id, ...body }
      if (method == 'PATCH') this.database[hostname][resource][index] = { id, ...this.database[hostname][resource][index], ...body }
      if (method == 'DELETE') this.database[hostname][resource][index] = undefined

      this.save()
      return json(database)

    } catch ({name, message, stack}) {
      return json({ error: {name, message, stack} })
    }
  }
}

const json = obj => new Response(JSON.stringify(obj, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' }})
const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds))
const generateId = () => Math.random().toString(36).slice(2, 10)

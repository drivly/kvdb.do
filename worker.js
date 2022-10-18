import { get } from 'lodash'

export const api = {
  icon: '👌',
  name: 'kvdb.do',
  description: 'Simple KV-based Database',
  url: 'https://kvdb.do/api',
  type: 'https://apis.do/database',
//   endpoints: {
//     listResources: 'https://namespace.kvdb.do',
//     listItems: 'https://namespace.kvdb.do/:resource',
//     getItem: 'https://namespace.kvdb.do/:resource/:id',
//   },
  site: 'https://kvdb.do',
  login: 'https://kvdb.do/login',
  signup: 'https://kvdb.do/signup',
  repo: 'https://github.com/drivly/kvdb.do',
}

export const endpoints = {
    listResources: 'https://namespace.kvdb.do',
    listItems: 'https://namespace.kvdb.do/:resource',
    getItem: 'https://namespace.kvdb.do/:resource/:id',
  }

export const gettingStarted = [
  `If you don't already have a JSON Viewer Browser Extension, get that first:`,
  `https://extensions.do`,
]

export const examples = {
  'List Northwind Resources': 'https://northwind.kvdb.do',
  'List Northwind Customers': 'https://northwind.kvdb.do/Customer',
  'Get Northwind Customer 1': 'https://northwind.kvdb.do/Customer/1',
}

const database = {}

export default {
  fetch: async (req, env) => {
    const start = new Date()
    const { user, method, origin, hostname, subdomain, pathname, rootPath, pathSegments, query } = await env.CTX.fetch(req.clone()).then(res => res.json())
    try {
      if (method == 'OPTIONS') return new Response(null, { headers: corsHeaders })
      if (rootPath && !subdomain) return json({ api, endpoints, examples, user })
      if (!database[hostname]) database[hostname] = await env.KVDB.get(hostname, { type: 'json', cacheTtl: 10 }) ?? {} //  cacheTtl: 3600
      // if (!user.authenticated) return Response.redirect(origin + '/login')

      console.log(Object.keys(database))

      if (method != 'GET') {
        const { updatedDatabase, data } = await env.KVDO.get(env.KVDO.idFromName(hostname)).fetch(req).then(res => res.json())
        console.log('Back in worker from DO with:', {data})
        database[hostname] = updatedDatabase
        return json({ api, data, user })
      }


      const [ resource, id ] = pathSegments

      const { skip, limit, ...filters } = query

      if (resource != '' && !database[hostname][resource]) database[hostname][resource] = []

      const data = resource ? (id ? 
          database[hostname][resource].find(item => item.id == id) : 
          database[hostname][resource].slice(skip ? parseInt(skip) : 0, limit).map(i => ({ url: `${origin}/${resource}/${i.id}`, ...i }))) : 
          Object.keys(database[hostname]).reduce((acc, v) => ({...acc, [v]: `${origin}/${v}`}), {})
      
      const links = {
        home: origin,
        list: resource ? `${origin}/${resource}` : undefined,
        item: id ? `${origin}/${resource}/${id}` : undefined,
      }

      user.responseMilliseconds = new Date() - start

      return json({ api, links, data, user })
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
    console.log('inside DO')
    let data = undefined
    const { user, method, hostname, pathname, rootPath, pathSegments, query, body } = await this.env.CTX.fetch(req).then(res => res.json())
    console.log('in DO:',{method, body})
    try {
      if (!this.hostname) this.hostname = hostname
      if (!this.database[hostname]) this.database[hostname] = await this.env.KVDB.get(hostname, { type: 'json' }) ?? {}

      const [ resource, id ] = pathSegments

      

      if (!this.database[hostname][resource]) this.database[hostname][resource] = []
      const index = this.database[hostname][resource].findIndex(item => item.id == id)

      console.log('before mutation', {resource, id, index})

      if (method == 'POST') {
        data = { id: id ?? generateId(), ...body }
        this.database[hostname][resource].push(data)
      } else if (index != -1) {

        if (method == 'PUT') data = { id, ...body }
        if (method == 'PATCH') data = { id, ...this.database[hostname][resource][index], ...body }
        if (method == 'DELETE') data = undefined
  
  
        this.database[hostname][resource][index] = data

      } else {
        return json({error: {name: 'Resource ID not found', message: `Resource ID '${id}' not found in '${resource}'`}})
      }


      console.log('data merged: ',{data,index, id})

      // await this.save()
      const saveAttempt = await this.env.KVDB.put(this.hostname, JSON.stringify(this.database[this.hostname]))
      console.log({saveAttempt})
      return json({updatedDatabase: this.database[hostname], data})

    } catch ({name, message, stack}) {
      return json({ error: {name, message, stack, do: this.state.id.toString(), method, data} })
    }
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const json = obj => new Response(JSON.stringify(obj, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }})
const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds))
const generateId = () => Math.random().toString(36).slice(2, 10)

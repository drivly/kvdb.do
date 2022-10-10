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

export default {
  fetch: async (req, env) => {
    const { user, hostname, pathname, rootPath, pathSegments, query } = await env.CTX.fetch(req).then(res => res.json())
    if (rootPath) return json({ api, gettingStarted, examples, user })
    
    // TODO: Implement this
    const [ resource, id ] = pathSegments
    const data = { resource, id, hello: user.city }
    
    return json({ api, data, user })
  }
}

const json = obj => new Response(JSON.stringify(obj, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' }})

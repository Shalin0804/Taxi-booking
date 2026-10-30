import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET
if (!SECRET || SECRET.length < 32) throw new Error('JWT_SECRET must be set (32+ characters)')

export const sign = (user) => jwt.sign({ sub: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' })

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role })

function readToken(req) {
  const h = req.headers.authorization || ''
  if (!h.startsWith('Bearer ')) return null
  try {
    return jwt.verify(h.slice(7), SECRET)
  } catch {
    return null
  }
}

/** Attaches req.user when a valid token is present; never rejects. */
export const optionalAuth = (req, _res, next) => {
  req.user = readToken(req)
  next()
}

/** Rejects unless signed in with one of the given roles (any role when none given). */
export const requireAuth = (...roles) => (req, res, next) => {
  const user = readToken(req)
  if (!user) return res.status(401).json({ error: 'Please sign in.' })
  if (roles.length && !roles.includes(user.role)) return res.status(403).json({ error: "You don't have access to this." })
  req.user = user
  next()
}

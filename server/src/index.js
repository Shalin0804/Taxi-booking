import { app } from './app.js'
import { migrate } from './db.js'

await migrate()
const port = process.env.PORT || 4000
app.listen(port, () => console.log(`TTT Cabs API listening on :${port}`))

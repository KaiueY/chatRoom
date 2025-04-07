import knexLib from 'knex'
import dotenv from 'dotenv'
import config from '../config.js'

dotenv.config()

const knex = knexLib(config.database)

export default knex
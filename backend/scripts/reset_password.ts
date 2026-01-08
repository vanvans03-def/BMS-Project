import { sql } from '../src/db'

async function resetAdmin() {
    const password = 'password'
    const hashedPassword = await Bun.password.hash(password)

    await sql`
        UPDATE users 
        SET password = ${hashedPassword}
        WHERE username = 'admin'
    `
    console.log('Admin password reset to: password')
    process.exit(0)
}

resetAdmin()

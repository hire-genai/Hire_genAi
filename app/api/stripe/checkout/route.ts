import { checkoutHandler } from '../../../../stripe/stripeRoutes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = checkoutHandler
